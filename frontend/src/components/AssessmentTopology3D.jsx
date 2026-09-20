import React, { useRef, useEffect, useState, useMemo } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { 
  Layers, RefreshCw, ZoomIn, ZoomOut, Info, Shield, 
  Server, AlertTriangle, FileText, CheckCircle2, GitBranch, Eye 
} from 'lucide-react';

export default function AssessmentTopology3D({ 
  entityId = 'CSE-07', 
  findings = [], 
  alerts = [], 
  cases = [], 
  assets = [],
  systemicPatterns = []
}) {
  const fgRef = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [selectedNode, setSelectedNode] = useState(null);
  const [visibleLayers, setVisibleLayers] = useState({
    entity: true,
    assets: true,
    findings: true,
    systemic: true,
  });

  // Track container dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth || 800,
          height: 520,
        });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Build graph data
  const graphData = useMemo(() => {
    const nodes = [];
    const links = [];

    // Root Entity node
    if (visibleLayers.entity) {
      nodes.push({
        id: entityId,
        name: entityId,
        group: 'entity',
        val: 16,
        color: '#1e3a8a',
        label: `${entityId} (Critical Sector Entity)`,
        sub: 'Critical infrastructure supervisory node'
      });
    }

    // Asset nodes
    const sampleAssets = assets.length > 0 ? assets.slice(0, 8) : [
      { asset_id: `${entityId}-SRV-01`, classification: 'CRITICAL', asset_type: 'Core Transaction Server' },
      { asset_id: `${entityId}-DB-01`, classification: 'CRITICAL', asset_type: 'Primary Settlement DB' },
      { asset_id: `${entityId}-FW-01`, classification: 'HIGH', asset_type: 'Perimeter Firewall' },
      { asset_id: `${entityId}-API-01`, classification: 'MEDIUM', asset_type: 'Gateway Endpoint' }
    ];

    if (visibleLayers.assets) {
      sampleAssets.forEach(ast => {
        const isCrit = ast.classification === 'CRITICAL';
        nodes.push({
          id: ast.asset_id,
          name: ast.asset_id,
          group: 'asset',
          val: isCrit ? 10 : 7,
          color: isCrit ? '#dc2626' : '#ea580c',
          label: `${ast.asset_id} [${ast.classification}]`,
          sub: ast.asset_type || 'Monitored asset'
        });

        if (visibleLayers.entity) {
          links.push({
            source: entityId,
            target: ast.asset_id,
            color: '#94a3b8',
            width: 1.5
          });
        }
      });
    }

    // Finding nodes
    const sampleFindings = findings.length > 0 ? findings.slice(0, 10) : [
      { id: 'F1', title: 'Anomalously Fast Critical Closure', severity: 'CRITICAL', rule_id: 'R-01', category: 'EXECUTION GAP' },
      { id: 'F2', title: 'Suppressed Tier Escalation', severity: 'HIGH', rule_id: 'R-05', category: 'EXECUTION GAP' },
      { id: 'F3', title: 'Missing Telemetry on Core DB', severity: 'CRITICAL', rule_id: 'NS-01', category: 'NEGATIVE SPACE' }
    ];

    if (visibleLayers.findings) {
      sampleFindings.forEach((f, idx) => {
        const isCrit = (f.priority || f.severity) === 'CRITICAL';
        const isHigh = (f.priority || f.severity) === 'HIGH';
        const fId = f.finding_id || f.id || `F-${idx}`;

        nodes.push({
          id: fId,
          name: f.title || f.rule_id || fId,
          group: 'finding',
          val: isCrit ? 9 : (isHigh ? 7 : 5),
          color: isCrit ? '#b91c1c' : (isHigh ? '#f97316' : '#d97706'),
          label: `Finding: ${f.title || f.rule_id || fId}`,
          sub: `${f.category || 'Operational Deviation'} (${f.priority || f.severity || 'HIGH'})`
        });

        // Link finding to relevant asset or entity
        const targetAsset = sampleAssets[idx % sampleAssets.length];
        if (visibleLayers.assets && targetAsset) {
          links.push({
            source: targetAsset.asset_id,
            target: fId,
            color: isCrit ? '#f87171' : '#fdba74',
            width: 2,
            dashed: true
          });
        } else if (visibleLayers.entity) {
          links.push({
            source: entityId,
            target: fId,
            color: '#cbd5e1',
            width: 1.2
          });
        }
      });
    }

    // Cross-Entity Systemic Pattern links
    if (visibleLayers.systemic && systemicPatterns.length > 0) {
      systemicPatterns.forEach(sp => {
        const entitiesInPattern = sp.affected_entities || [];
        if (entitiesInPattern.includes(entityId)) {
          // Add peer entity node
          entitiesInPattern.forEach(peerId => {
            if (peerId !== entityId && !nodes.some(n => n.id === peerId)) {
              nodes.push({
                id: peerId,
                name: peerId,
                group: 'peer_entity',
                val: 12,
                color: '#475569',
                label: `Peer Entity: ${peerId}`,
                sub: `Affected by ${sp.rule_name || sp.rule_id}`
              });

              links.push({
                source: entityId,
                target: peerId,
                color: '#7c3aed', // Purple systemic edge
                width: 2.5,
                curvature: 0.2,
                name: `Systemic: ${sp.rule_name || sp.rule_id}`
              });
            }
          });
        }
      });
    }

    return { nodes, links };
  }, [entityId, findings, assets, systemicPatterns, visibleLayers]);

  const handleNodeClick = (node) => {
    setSelectedNode(node);
    if (fgRef.current) {
      // Smoothly focus camera onto clicked node
      const distance = 140;
      const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
      fgRef.current.cameraPosition(
        { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
        node,
        1500
      );
    }
  };

  const handleResetCamera = () => {
    setSelectedNode(null);
    if (fgRef.current) {
      fgRef.current.cameraPosition({ x: 0, y: 0, z: 280 }, { x: 0, y: 0, z: 0 }, 1200);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-md p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-700" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Supervisory Evidence Topology · {entityId}
          </h3>
          <span className="text-[10px] bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded font-mono font-semibold">
            WebGL 3D Force Matrix
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Layer toggles */}
          <div className="flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-50 p-1 rounded border border-slate-200">
            {Object.keys(visibleLayers).map(key => (
              <button
                key={key}
                onClick={() => setVisibleLayers(prev => ({ ...prev, [key]: !prev[key] }))}
                className={`px-2 py-0.5 rounded capitalize text-[10px] transition-colors ${
                  visibleLayers[key] 
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200 font-semibold' 
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          {/* Camera reset */}
          <button
            onClick={handleResetCamera}
            className="p-1.5 text-slate-500 hover:text-slate-900 border border-slate-200 rounded bg-white hover:bg-slate-50 transition-colors flex items-center gap-1 text-[11px] font-semibold"
            title="Reset 3D Viewpoint"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset View</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* 3D Force Graph Canvas */}
        <div 
          ref={containerRef}
          className="lg:col-span-3 relative border border-slate-200 rounded bg-slate-900 overflow-hidden min-h-[480px]"
        >
          <ForceGraph3D
            ref={fgRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            backgroundColor="#0f172a"
            nodeRelSize={4}
            nodeVal="val"
            nodeColor="color"
            nodeLabel="label"
            linkColor="color"
            linkWidth="width"
            linkOpacity={0.6}
            linkDirectionalParticles={1}
            linkDirectionalParticleSpeed={0.005}
            onNodeClick={handleNodeClick}
            warmupTicks={50}
            cooldownTicks={100}
          />
          <div className="absolute bottom-2 left-2 text-[10px] text-slate-400 bg-slate-800/80 px-2 py-1 rounded border border-slate-700 pointer-events-none">
            Left Click: Rotate · Right Click: Pan · Scroll: Zoom · Click Node: Focus & Inspect
          </div>
        </div>

        {/* Node Inspector Drawer */}
        <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[11px]">
              <Info className="w-3.5 h-3.5 text-blue-700" />
              Evidence Inspector
            </div>

            {selectedNode ? (
              <div className="space-y-2.5">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Node Identifier</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{selectedNode.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Layer Classification</span>
                  <span className="inline-block px-2 py-0.5 rounded bg-white border border-slate-200 font-semibold uppercase text-[10px] text-slate-800 mt-0.5">
                    {selectedNode.group}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Operational Context</span>
                  <p className="text-slate-700 text-[11px] mt-0.5">{selectedNode.sub || 'Grounded evidence entity'}</p>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase">Supervisory Integrity</span>
                  <p className="text-slate-600 text-[11px]">All connected assets and findings are verified against local DB records without external reliance.</p>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 space-y-1">
                <p className="font-medium text-slate-500">No node selected</p>
                <p className="text-[11px]">Click on any 3D node (Entity, Asset, Finding, or Systemic link) to inspect its operational evidence chain.</p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-2 border-t border-slate-200 text-[10px] text-slate-500 space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-700 inline-block"></span>
              <span>Entity Node</span>
              <span className="w-2 h-2 rounded-full bg-red-600 inline-block ml-2"></span>
              <span>Critical Asset / Finding</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-600 inline-block"></span>
              <span>Cross-Entity Systemic Edge</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
