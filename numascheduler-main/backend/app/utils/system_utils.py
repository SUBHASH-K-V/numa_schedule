import subprocess
import os
import re
import psutil
from typing import List, Dict, Optional


def run_command(cmd: List[str]) -> str:
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        return result.stdout
    except (subprocess.TimeoutExpired, FileNotFoundError, OSError):
        return ""


def parse_lscpu() -> Dict:
    output = run_command(["lscpu"])
    data = {}
    for line in output.split("\n"):
        if ":" in line:
            key, val = line.split(":", 1)
            data[key.strip()] = val.strip()
    return data


def parse_numactl_hardware() -> List[Dict]:
    output = run_command(["numactl", "--hardware"])
    nodes = []
    if not output:
        return _fallback_numa_discovery()

    current_node = None
    for line in output.split("\n"):
        if line.startswith("available:"):
            continue
        if "node" in line and "cpus" in line:
            match = re.match(r"node\s+(\d+)\s+cpus:\s+(.*)", line)
            if match:
                if current_node:
                    nodes.append(current_node)
                node_id = int(match.group(1))
                cpus = [int(x) for x in match.group(2).strip().split()]
                current_node = {"node_id": node_id, "cpus": cpus}
        elif "node" in line and "size" in line:
            match = re.match(r"node\s+(\d+)\s+size:\s+(\d+)\s+MB", line)
            if match and current_node:
                current_node["total_memory"] = float(match.group(2))
        elif "node" in line and "free" in line:
            match = re.match(r"node\s+(\d+)\s+free:\s+(\d+)\s+MB", line)
            if match and current_node:
                current_node["free_memory"] = float(match.group(2))
                nodes.append(current_node)
                current_node = None

    if current_node:
        nodes.append(current_node)

    return nodes if nodes else _fallback_numa_discovery()


def _fallback_numa_discovery() -> List[Dict]:
    nodes = []
    try:
        node_dirs = sorted(
            [d for d in os.listdir("/sys/devices/system/node/") if d.startswith("node")],
            key=lambda x: int(x[4:]),
        )
        for nd in node_dirs:
            node_id = int(nd[4:])
            cpu_path = f"/sys/devices/system/node/{nd}"
            cpus = []
            if os.path.exists(f"{cpu_path}/cpulist"):
                with open(f"{cpu_path}/cpulist") as f:
                    cpulist = f.read().strip()
                    cpus = _parse_cpulist(cpulist)

            meminfo_path = f"{cpu_path}/meminfo"
            total_mem = 0
            free_mem = 0
            if os.path.exists(meminfo_path):
                with open(meminfo_path) as f:
                    for line in f:
                        if "MemTotal" in line:
                            match = re.search(r"(\d+)", line)
                            if match:
                                total_mem = float(match.group(1)) / 1024
                        if "MemFree" in line:
                            match = re.search(r"(\d+)", line)
                            if match:
                                free_mem = float(match.group(1)) / 1024

            nodes.append({
                "node_id": node_id,
                "cpus": cpus,
                "total_memory": total_mem,
                "free_memory": free_mem,
            })
    except (FileNotFoundError, PermissionError):
        nodes.append({
            "node_id": 0,
            "cpus": list(range(psutil.cpu_count())),
            "total_memory": psutil.virtual_memory().total / (1024 * 1024),
            "free_memory": psutil.virtual_memory().available / (1024 * 1024),
        })

    return nodes


def _parse_cpulist(cpulist: str) -> List[int]:
    cpus = []
    for part in cpulist.split(","):
        part = part.strip()
        if "-" in part:
            start, end = part.split("-")
            cpus.extend(range(int(start), int(end) + 1))
        else:
            try:
                cpus.append(int(part))
            except ValueError:
                pass
    return cpus


def get_thread_numa_node(tid: int) -> Optional[int]:
    try:
        path = f"/proc/{tid}/status"
        if os.path.exists(path):
            with open(path) as f:
                for line in f:
                    if "Mems_allowed_list" in line:
                        match = re.search(r"(\d+)", line)
                        if match:
                            return int(match.group(1))
    except (FileNotFoundError, PermissionError, ValueError):
        pass
    return None


def get_thread_cpu(tid: int) -> Optional[int]:
    try:
        path = f"/proc/{tid}/stat"
        if os.path.exists(path):
            with open(path) as f:
                data = f.read()
                fields = data.split()
                if len(fields) > 38:
                    return int(fields[38])
    except (FileNotFoundError, PermissionError, ValueError):
        pass
    return None


def get_cpu_affinity(tid: int) -> List[int]:
    try:
        affinity = os.sched_getaffinity(tid)
        return list(affinity)
    except (OSError, PermissionError):
        return []


def set_cpu_affinity(tid: int, cpus: List[int]):
    try:
        os.sched_setaffinity(tid, set(cpus))
        return True
    except (OSError, PermissionError):
        return False


def migrate_thread(tid: int, target_cpu: int) -> bool:
    return set_cpu_affinity(tid, [target_cpu])


def get_numastat() -> Dict:
    output = run_command(["numastat"])
    data = {}
    if output:
        for line in output.split("\n")[1:]:
            parts = line.split()
            if len(parts) >= 2:
                key = parts[0].strip().rstrip(":")
                values = [float(x) for x in parts[1:]]
                data[key] = values
    return data


def get_node_from_cpu(cpu: int, topology: List[Dict]) -> Optional[int]:
    for node in topology:
        if cpu in node["cpus"]:
            return node["node_id"]
    return None
