from typing import List, Dict
from app.utils.system_utils import parse_numactl_hardware, parse_lscpu


class TopologyService:
    def __init__(self):
        self._cached_topology: List[Dict] = []
        self._cached_lscpu: Dict = {}

    def discover(self) -> List[Dict]:
        self._cached_topology = parse_numactl_hardware()
        self._cached_lscpu = parse_lscpu()
        return self._cached_topology

    def get_topology(self) -> List[Dict]:
        if not self._cached_topology:
            return self.discover()
        return self._cached_topology

    def get_raw_lscpu(self) -> Dict:
        if not self._cached_lscpu:
            self._cached_lscpu = parse_lscpu()
        return self._cached_lscpu

    def get_node_count(self) -> int:
        return len(self.get_topology())

    def get_cpus_for_node(self, node_id: int) -> List[int]:
        for node in self.get_topology():
            if node["node_id"] == node_id:
                return node["cpus"]
        return []

    def get_total_cpus(self) -> int:
        total = 0
        for node in self.get_topology():
            total += len(node["cpus"])
        return total

    def get_total_memory(self) -> float:
        total = 0.0
        for node in self.get_topology():
            total += node.get("total_memory", 0)
        return total

    def get_node_from_cpu(self, cpu: int) -> int:
        for node in self.get_topology():
            if cpu in node["cpus"]:
                return node["node_id"]
        return 0

    def invalidate_cache(self):
        self._cached_topology = []
        self._cached_lscpu = {}
