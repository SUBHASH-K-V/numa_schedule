from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.topology_service import TopologyService
from app.services.monitor_service import MonitorService
from app.schemas import NumaTopologyResponse, NumaTopologyNode

router = APIRouter(prefix="/api/topology", tags=["topology"])


def get_topology_service() -> TopologyService:
    from app.main import get_topology_service as gts
    return gts()


def get_monitor_service() -> MonitorService:
    from app.main import get_monitor_service as gms
    return gms()


@router.get("", response_model=NumaTopologyResponse)
async def get_topology(
    db: Session = Depends(get_db),
    topology_service: TopologyService = Depends(get_topology_service),
    monitor_service: MonitorService = Depends(get_monitor_service),
):
    topology = topology_service.get_topology()
    numa_metrics = monitor_service.get_numa_metrics(db, limit=20)

    node_metrics_map = {}
    for m in numa_metrics:
        if m.node_id not in node_metrics_map:
            node_metrics_map[m.node_id] = m

    sim_node_id = None
    if monitor_service.is_simulation_mode() and len(topology) <= 1:
        sim_node_id = 1

    nodes = []
    for node in topology:
        nid = node["node_id"]
        nm = node_metrics_map.get(nid)
        nodes.append(
            NumaTopologyNode(
                node_id=nid,
                cpus=node.get("cpus", []),
                total_memory=node.get("total_memory", 0),
                free_memory=nm.free_memory if nm else node.get("free_memory", 0),
                active_threads=nm.active_threads if nm else 0,
                node_load=nm.node_load if nm else 0,
            )
        )

    if sim_node_id is not None:
        nm = node_metrics_map.get(sim_node_id)
        half_cpus = topology[0].get("cpus", [])[:len(topology[0].get("cpus", [])) // 2] if topology else []
        nodes.append(
            NumaTopologyNode(
                node_id=sim_node_id,
                cpus=half_cpus if half_cpus else [99],
                total_memory=nm.total_memory if nm else 4096,
                free_memory=nm.free_memory if nm else 2048,
                active_threads=nm.active_threads if nm else 0,
                node_load=nm.node_load if nm else 25.0,
            )
        )

    total_cpus = topology_service.get_total_cpus()
    total_memory = topology_service.get_total_memory()

    return NumaTopologyResponse(
                nodes=nodes,
        total_cpus=total_cpus,
        total_memory=total_memory,
    )


@router.post("/refresh")
async def refresh_topology(
    topology_service: TopologyService = Depends(get_topology_service),
):
    topology_service.invalidate_cache()
    topology_service.discover()
    return {"status": "ok", "message": "Topology refreshed"}
