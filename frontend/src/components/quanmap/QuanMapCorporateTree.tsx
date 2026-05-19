import React, { useEffect, useState, useCallback, useMemo } from 'react';
import ReactFlow, { 
  Background, Controls, Handle, Position, MarkerType 
} from 'react-flow-renderer';
import type { Node, Edge } from 'react-flow-renderer';
import { Loader2, Search, AlertCircle, TrendingUp, Scaling } from 'lucide-react';
import { useTheme } from '../../theme/ThemeProvider';
import { API_BASE } from '../../config/api';

interface SubData {
  symbol: string;
  name: string;
  sector: string;
  ownership: number;
  marketCap: number;
}

interface TreeData {
  parent: { symbol: string; name: string; sector: string; marketCap: number; };
  subsidiaries: SubData[];
  group: string;
}

// Custom Node for Parent Group
const ParentNode = ({ data }: any) => {
  return (
    <div className="px-6 py-4 shadow-xl rounded-xl bg-surface border-2 border-accent text-center min-w-[250px]">
      <div className="w-12 h-12 rounded-full border border-border mx-auto mb-3 overflow-hidden bg-white flex items-center justify-center">
        <img src={`https://logo.clearbit.com/${data.name.split(' ')[0].toLowerCase()}.com`} alt="Logo" 
             onError={(e) => (e.currentTarget.src = `https://ui-avatars.com/api/?name=${data.name}&background=random`)}
             className="w-8 h-8 object-contain" />
      </div>
      <h3 className="text-lg font-black text-text-primary tracking-tight leading-tight">{data.name}</h3>
      <div className="mt-2 inline-block px-2 py-1 bg-accent/10 rounded text-accent text-xs font-mono border border-accent/20">
        {data.symbol}
      </div>
      <p className="mt-1 text-xs text-text-muted">{data.sector}</p>
      {data.marketCap > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-[10px] uppercase text-text-muted tracking-widest">Group MCap Estimated</p>
          <p className="text-sm font-mono text-text-primary font-bold">₹{(data.marketCap / 1e10).toFixed(1)}k Cr</p>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-accent" />
    </div>
  );
};

// Custom Node for Subsidiary Firm
const SubNode = ({ data }: any) => {
  return (
    <div className="px-4 py-3 shadow-lg rounded-lg bg-background border border-border min-w-[200px] hover:border-accent/50 transition-colors">
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-text-muted" />
      <div className="flex justify-between items-start mb-2 pb-2 border-b border-border/50">
        <h4 className="font-bold text-sm text-text-primary flex-1 pr-2 truncate" title={data.name}>{data.name}</h4>
        <span className="text-[10px] bg-surface text-text-secondary px-1.5 py-0.5 rounded font-mono border border-border">
          {data.symbol}
        </span>
      </div>
      <div className="flex justify-between items-center text-xs">
        <span className="text-text-muted truncate w-20">{data.sector}</span>
        <span className="font-mono font-medium text-text-primary text-right">
          ₹{(data.marketCap / 1e10).toFixed(1)}k Cr
        </span>
      </div>
    </div>
  );
};

const nodeTypes = {
  parent: ParentNode,
  subsidiary: SubNode,
};

const QuanMapCorporateTree: React.FC = () => {
  const { themeMode } = useTheme();
  const [search, setSearch] = useState('TATA');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [treeData, setTreeData] = useState<TreeData | null>(null);

  // Suggested conglomerates
  const suggestions = ['TATA', 'ADANI', 'RELIANCE', 'MAHINDRA', 'BIRLA', 'BAJAJ', 'GODREJ'];

  const fetchTree = useCallback(async (symbol: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/api/v1/quanmap/corporate-tree?parent=${symbol}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error(`No corporate tree mapping found for '${symbol}'`);
        throw new Error('Failed to fetch corporate tree');
      }
      const json = await res.json();
      setTreeData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setTreeData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTree('TATA');
  }, [fetchTree]);

  // Generate Nodes and Edges from API response
  const { nodes, edges } = useMemo(() => {
    if (!treeData) return { nodes: [], edges: [] };

    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];
    const X_CENTER = 400;

    // Parent
    flowNodes.push({
      id: 'parent',
      type: 'parent',
      position: { x: X_CENTER, y: 50 },
      data: treeData.parent,
    });

    // Kids
    const count = treeData.subsidiaries.length;
    const X_SPACING = 250;
    const startX = X_CENTER - ((count - 1) * X_SPACING) / 2;

    treeData.subsidiaries.forEach((sub, i) => {
      const id = `sub-${sub.symbol}`;
      
      flowNodes.push({
        id,
        type: 'subsidiary',
        position: { x: startX + (i * X_SPACING), y: 300 + (i % 2 === 0 ? 0 : 50) }, // Stagger heights slightly
        data: sub,
      });

      flowEdges.push({
        id: `e-parent-${id}`,
        source: 'parent',
        target: id,
        label: sub.ownership ? `${sub.ownership}%` : 'JV / Direct',
        type: 'smoothstep',
        animated: true,
        style: { stroke: themeMode === 'dark' ? '#3B82F6' : '#2563EB', strokeWidth: 2 },
        labelStyle: { fill: themeMode === 'dark' ? '#D1D5DB' : '#374151', fontWeight: 600, fontSize: 11 },
        labelBgStyle: { fill: themeMode === 'dark' ? '#1F2937' : '#FFFFFF', stroke: themeMode === 'dark' ? '#374151' : '#E5E7EB', strokeWidth: 1 },
        labelBgPadding: [6, 4],
        labelBgBorderRadius: 4,
        markerEnd: { type: MarkerType.ArrowClosed, color: themeMode === 'dark' ? '#3B82F6' : '#2563EB' }
      });
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [treeData, themeMode]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) fetchTree(search.trim());
  };

  return (
    <div className="w-full h-full flex flex-col relative">
      <div className="absolute top-6 left-6 z-20 w-80">
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-2xl">
          <h2 className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-4 flex items-center">
            <Scaling size={14} className="mr-2 text-accent" />
            <span>Corporate Trees</span>
          </h2>
          
          <form onSubmit={handleSearch} className="mb-4">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Conglomerate symbol..."
                className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
              <Search className="absolute left-3 top-2.5 text-text-muted" size={16} />
              <button 
                type="submit"
                className="absolute right-2 top-1.5 p-1 bg-surface hover:bg-accent hover:text-white rounded transition-colors text-text-secondary"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
              </button>
            </div>
          </form>

          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold">Indian Giants</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => { setSearch(s); fetchTree(s); }}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    treeData?.group === s ? 'bg-accent/20 text-accent font-medium border border-accent/30' : 'bg-background text-text-secondary hover:bg-surface border border-border hover:border-text-muted'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full bg-background relative" style={{ backgroundColor: themeMode === 'dark' ? '#0a0a0a' : '#f8f9fa' }}>
        {error ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
            <AlertCircle size={48} className="text-red-500 mb-4" />
            <h3 className="text-xl font-bold text-text-primary mb-2">Not Found</h3>
            <p className="text-text-muted text-center max-w-md">{error}</p>
          </div>
        ) : (
          <ReactFlow 
            nodes={nodes} 
            edges={edges} 
            nodeTypes={nodeTypes}
            fitView 
            fitViewOptions={{ padding: 0.2 }}
            attributionPosition="bottom-right"
          >
            <Background color={themeMode === 'dark' ? '#333' : '#ddd'} gap={20} size={1} />
            <Controls className={`bg-surface border-border !rounded-lg overflow-hidden shadow-lg ${themeMode === 'dark' ? 'dark-controls' : ''}`} />
          </ReactFlow>
        )}
      </div>
    </div>
  );
};

export default QuanMapCorporateTree;
