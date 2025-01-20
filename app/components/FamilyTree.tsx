'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { FamilyNode, FamilyLink } from '../models/FamilyNode';

interface EditModalProps {
  node: FamilyNode;
  onSave: (name: string) => void;
  onCancel: () => void;
}

const EditModal = ({ node, onSave, onCancel }: EditModalProps) => {
  const [name, setName] = useState(node.name);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-96">
        <h3 className="text-xl text-white mb-4">Edit Name</h3>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none mb-4"
          autoFocus
        />
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => onCancel()}
            className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(name)}
            className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

interface FamilyNode {
  id: string;
  name: string;
  parentId: string | null;
  isExpanded?: boolean;
}

const FamilyTree = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [familyData, setFamilyData] = useState<{ nodes: FamilyNode[], links: FamilyLink[] }>({ 
    nodes: [{ id: '1', name: 'Beşo', parentId: null, children: [] }], 
    links: [] 
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<FamilyNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['1'])); // Root is initially expanded

  // Fetch family data
  const fetchFamilyData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/family');
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
        return;
      }

      if (!data.nodes || data.nodes.length === 0) {
        setFamilyData({ 
          nodes: [{ id: '1', name: 'Beşo', parentId: null, children: [] }], 
          links: [] 
        });
      } else {
        setFamilyData(data);
      }
    } catch (error) {
      console.error('Error fetching family data:', error);
      setError('Failed to fetch family data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const res = await fetch('/api/auth/check');
        const data = await res.json();
        setIsAdmin(data.isAdmin);
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };

    checkAdmin();
    fetchFamilyData();
  }, []);

  const handleAddChild = async (parentId: string) => {
    try {
      setError(null);
      const res = await fetch('/api/admin/addNode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ parentId }),
      });

      if (res.ok) {
        await fetchFamilyData();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to add node');
      }
    } catch (error) {
      console.error('Error adding child:', error);
      setError('Failed to add child');
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    try {
      setError(null);
      const res = await fetch('/api/admin/deleteNode', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nodeId }),
      });

      if (res.ok) {
        await fetchFamilyData();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete node');
      }
    } catch (error) {
      console.error('Error deleting node:', error);
      setError('Failed to delete node');
    }
  };

  const handleUpdateName = async (name: string) => {
    if (!editingNode) return;
    
    try {
      setError(null);
      const res = await fetch('/api/admin/updateNode', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nodeId: editingNode.id, name }),
      });

      if (res.ok) {
        await fetchFamilyData();
        setEditingNode(null);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update node');
      }
    } catch (error) {
      console.error('Error updating node:', error);
      setError('Failed to update node');
    }
  };

  const toggleNodeExpansion = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        // When collapsing, remove this node and all its descendants
        const nodesToRemove = new Set<string>();
        const addDescendants = (id: string) => {
          nodesToRemove.add(id);
          familyData.nodes
            .filter(node => node.parentId === id)
            .forEach(child => addDescendants(child.id));
        };
        addDescendants(nodeId);
        
        // Remove all descendants from expanded nodes
        nodesToRemove.forEach(id => newSet.delete(id));
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const showAllNodes = () => {
    const allNodeIds = familyData.nodes.map(node => node.id);
    setExpandedNodes(new Set(allNodeIds));
  };

  // Get visible nodes based on user type and expanded state
  const getVisibleNodes = () => {
    // Admin sees all nodes
    if (isAdmin) {
      return familyData.nodes;
    }

    // Regular users see only expanded nodes
    const visibleNodes = new Set<string>();
    const visibleNodesWithParents = new Set<string>();
    
    // Always show root
    visibleNodes.add('1');
    visibleNodesWithParents.add('1');
    
    // For each expanded node, show its immediate children
    expandedNodes.forEach(nodeId => {
      familyData.nodes
        .filter(node => node.parentId === nodeId)
        .forEach(node => {
          visibleNodes.add(node.id);
          visibleNodesWithParents.add(node.id);
          // Also add the parent to ensure tree connectivity
          if (node.parentId) {
            visibleNodesWithParents.add(node.parentId);
          }
        });
    });

    // First get all visible nodes
    const nodesToShow = familyData.nodes.filter(node => visibleNodes.has(node.id));
    
    // Then ensure we include all parent nodes in the path to root
    nodesToShow.forEach(node => {
      let currentNode = node;
      while (currentNode.parentId) {
        visibleNodesWithParents.add(currentNode.parentId);
        currentNode = familyData.nodes.find(n => n.id === currentNode.parentId)!;
      }
    });

    // Return nodes that are either visible or are parents of visible nodes
    return familyData.nodes.filter(node => visibleNodesWithParents.has(node.id));
  };

  const getResponsiveNodeRadius = (depth: number, screenWidth: number) => {
    const isMobile = screenWidth < 768;
    // Root node (depth 0) is 3 times larger
    const baseRadius = (isMobile ? 45 : 60) * 3;
    
    if (depth === 0) {
      return baseRadius; // Root node
    }
    
    // Progressive reduction rates starting from 50% and decreasing by 5% each generation
    const getReductionRate = (level: number) => {
      const baseReduction = 0.50; // 50% reduction for first generation
      const reductionDecrement = 0.05; // 5% less reduction each generation
      const reduction = Math.max(baseReduction - (level - 1) * reductionDecrement, 0.15);
      return 1 - reduction;
    };

    // Calculate size based on parent's size with progressive reduction
    let currentSize = baseRadius;
    for (let i = 1; i <= depth; i++) {
      currentSize *= getReductionRate(i);
    }
    
    return currentSize;
  };

  const getResponsiveFontSize = (depth: number, screenWidth: number) => {
    const isMobile = screenWidth < 768;
    // Base font size scaled by 2 (instead of 3 like nodes)
    const baseSize = (isMobile ? 14 : 18) * 2;
    
    if (depth === 0) {
      return baseSize; // Root node font
    }
    
    // Use same reduction pattern as nodes but with slightly less dramatic reduction
    const getReductionRate = (level: number) => {
      const baseReduction = 0.45; // Start with 45% reduction (instead of 50%)
      const reductionDecrement = 0.05;
      const reduction = Math.max(baseReduction - (level - 1) * reductionDecrement, 0.15);
      return 1 - reduction;
    };

    let currentSize = baseSize;
    for (let i = 1; i <= depth; i++) {
      currentSize *= getReductionRate(i);
    }
    
    return currentSize;
  };

  useEffect(() => {
    if (!svgRef.current || isLoading) return;

    const updateDimensions = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isMobile = width < 768;

      // Update SVG dimensions - adjusted for smaller root node
      const svg = d3.select(svgRef.current)
        .attr('width', width * 1.1) // Reduced canvas size
        .attr('height', height * 1.1);

      // Clear previous content
      svg.selectAll('*').remove();

      // Create a group for zoom/pan
      const g = svg.append('g');

      // Add zoom behavior with different scale limits for mobile
      const zoom = d3.zoom()
        .scaleExtent([isMobile ? 0.1 : 0.15, isMobile ? 2 : 4])
        .on('zoom', (event) => {
          g.attr('transform', event.transform);
        });

      svg.call(zoom);
      
      // Adjust initial scale for smaller root node
      const rootNodeSize = getResponsiveNodeRadius(0, width);
      const initialScale = isMobile ? 0.5 : 0.7; // Increased scale for better initial view
      svg.call(zoom.transform, d3.zoomIdentity
        .translate(width * 0.55, height * 0.55) // Adjusted for new canvas size
        .scale(initialScale)
        .translate(-width / 2, -height / 2));

      // Get visible nodes based on user type
      const visibleNodes = getVisibleNodes();

      // Create a hierarchical layout
      const hierarchy = d3.stratify<FamilyNode>()
        .id(d => d.id)
        .parentId(d => d.parentId)(visibleNodes);

      // Create a tree layout with adjusted spacing
      const treeLayout = d3.tree<FamilyNode>()
        .size([
          width, // Standard size
          height
        ]);

      const root = treeLayout(hierarchy);

      // Calculate initial positions
      const nodes = root.descendants().map(d => ({
        ...d.data,
        x: d.x + width / 2,
        y: d.y + (isMobile ? 50 : 100),
        depth: d.depth
      }));

      const links = root.links().map(d => ({
        source: nodes.find(n => n.id === d.source.data.id)!,
        target: nodes.find(n => n.id === d.target.data.id)!
      }));

      // Helper function to get node radius based on depth
      const getNodeRadius = (depth: number) => {
        const baseRadius = 50;
        return Math.max(baseRadius * Math.pow(0.8, depth), 30);
      };

      // Helper function to get expand button radius
      const getButtonRadius = (depth: number) => {
        return getNodeRadius(depth) * 0.25;
      };

      // Helper function to get button vertical offset
      const getButtonOffset = (depth: number) => {
        return getNodeRadius(depth) * 0.7; // Position below the node
      };

      // Helper function to get font size based on depth
      const getNodeFontSize = (depth: number) => {
        const baseSize = 16;
        return Math.max(baseSize * Math.pow(0.9, depth), 12);
      };

      const simulation = d3.forceSimulation<any>(nodes)
        .force('link', d3.forceLink(links)
          .id((d: any) => d.id)
          .distance(d => {
            // Increase distance based on parent node size
            const sourceRadius = getResponsiveNodeRadius(d.source.depth, width);
            const targetRadius = getResponsiveNodeRadius(d.target.depth, width);
            // Adjusted spacing between nodes
            return sourceRadius + targetRadius + (isMobile ? 20 : 40);
          }))
        .force('charge', d3.forceManyBody().strength(-300)) // Reduced repulsion
        .force('center', d3.forceCenter(width * 0.55, height * 0.55))
        .force('collision', d3.forceCollide().radius(d => getResponsiveNodeRadius(d.depth, width) * 1.02))
        .force('x', d3.forceX().strength(0.08))
        .force('y', d3.forceY().strength(0.08));

      const defs = svg.append('defs');

      // Gradient for glossy effect
      const gradient = defs.append('linearGradient')
        .attr('id', 'glossGradient')
        .attr('x1', '0%')
        .attr('x2', '0%')
        .attr('y1', '0%')
        .attr('y2', '100%');

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('style', 'stop-color:rgba(255,255,255,0.95);stop-opacity:0.95');

      gradient.append('stop')
        .attr('offset', '20%')
        .attr('style', 'stop-color:rgba(147,112,219,0.6);stop-opacity:0.6');

      gradient.append('stop')
        .attr('offset', '80%')
        .attr('style', 'stop-color:rgba(138,43,226,0.6);stop-opacity:0.6');

      gradient.append('stop')
        .attr('offset', '100%')
        .attr('style', 'stop-color:rgba(128,0,128,0.7);stop-opacity:0.7');

      // Drop shadow filter with purple tint
      const filter = defs.append('filter')
        .attr('id', 'dropShadow')
        .attr('x', '-50%')
        .attr('y', '-50%')
        .attr('width', '200%')
        .attr('height', '200%');

      filter.append('feGaussianBlur')
        .attr('in', 'SourceAlpha')
        .attr('stdDeviation', 5)
        .attr('result', 'blur');

      filter.append('feOffset')
        .attr('in', 'blur')
        .attr('dx', 4)
        .attr('dy', 4)
        .attr('result', 'offsetBlur');

      filter.append('feComponentTransfer')
        .append('feFuncA')
        .attr('type', 'linear')
        .attr('slope', '0.5');

      const feMerge = filter.append('feMerge');
      feMerge.append('feMergeNode')
        .attr('in', 'offsetBlur');
      feMerge.append('feMergeNode')
        .attr('in', 'SourceGraphic');

      // Glass reflection effect
      const highlight = defs.append('linearGradient')
        .attr('id', 'highlight')
        .attr('x1', '0%')
        .attr('x2', '0%')
        .attr('y1', '0%')
        .attr('y2', '100%');

      highlight.append('stop')
        .attr('offset', '0%')
        .attr('style', 'stop-color:white;stop-opacity:0.8');

      highlight.append('stop')
        .attr('offset', '30%')
        .attr('style', 'stop-color:white;stop-opacity:0.3');

      highlight.append('stop')
        .attr('offset', '100%')
        .attr('style', 'stop-color:white;stop-opacity:0.1');

      // Links with purple gradient
      const linkGradient = defs.append('linearGradient')
        .attr('id', 'linkGradient')
        .attr('gradientUnits', 'userSpaceOnUse');

      linkGradient.append('stop')
        .attr('offset', '0%')
        .attr('style', 'stop-color:rgba(147,112,219,0.6)');

      linkGradient.append('stop')
        .attr('offset', '100%')
        .attr('style', 'stop-color:rgba(138,43,226,0.3)');

      // Add glass edge effect
      const glassEdge = defs.append('filter')
        .attr('id', 'glassEdge')
        .attr('x', '-50%')
        .attr('y', '-50%')
        .attr('width', '200%')
        .attr('height', '200%');

      glassEdge.append('feGaussianBlur')
        .attr('in', 'SourceAlpha')
        .attr('stdDeviation', '2')
        .attr('result', 'blur');

      glassEdge.append('feComposite')
        .attr('in', 'SourceGraphic')
        .attr('in2', 'blur')
        .attr('operator', 'arithmetic')
        .attr('k2', '1')
        .attr('k3', '-1')
        .attr('result', 'edge');

      const links_g = svg.append('g')
        .selectAll('line')
        .data(links)
        .enter()
        .append('line')
        .attr('stroke', 'url(#linkGradient)')
        .attr('stroke-width', 2)
        .attr('opacity', 0.8);

      const nodes_g = svg.append('g')
        .selectAll('g')
        .data(nodes)
        .enter()
        .append('g')
        .call(d3.drag<any, any>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended));

      // Base circle with gradient and shadow
      nodes_g.append('circle')
        .attr('r', d => getResponsiveNodeRadius(d.depth, width))
        .attr('fill', 'url(#glossGradient)')
        .attr('filter', 'url(#dropShadow)')
        .style('stroke', 'rgba(255,255,255,0.8)')
        .style('stroke-width', isMobile ? '1px' : '2px');

      // Glass edge effect
      nodes_g.append('circle')
        .attr('r', d => getResponsiveNodeRadius(d.depth, width))
        .attr('filter', 'url(#glassEdge)')
        .style('fill', 'none')
        .style('stroke', 'rgba(255,255,255,0.4)')
        .style('stroke-width', '1px')
        .style('pointer-events', 'none');

      // Highlight overlay for glass effect
      nodes_g.append('circle')
        .attr('r', d => getResponsiveNodeRadius(d.depth, width))
        .attr('fill', 'url(#highlight)')
        .attr('opacity', 0.6)
        .style('pointer-events', 'none');

      // Add text elements for node names with enhanced shadow
      nodes_g.append('text')
        .text((d: FamilyNode) => d.name)
        .attr('text-anchor', 'middle')
        .attr('dy', '.35em')
        .attr('fill', '#fff')
        .attr('filter', 'url(#dropShadow)')
        .style('font-size', d => `${getResponsiveFontSize(d.depth, width)}px`)
        .style('cursor', isAdmin ? 'pointer' : 'default')
        .style('text-shadow', '0 1px 3px rgba(0,0,0,0.4)')
        .style('font-weight', '500')
        .on('dblclick', (event, d: FamilyNode) => {
          if (isAdmin) {
            setEditingNode(d);
          }
        });

      if (isAdmin) {
        // Add '+' button with adjusted positions for root node
        nodes_g.append('circle')
          .attr('r', d => getButtonRadius(d.depth))
          .attr('cx', d => getButtonOffset(d.depth))
          .attr('cy', d => -getButtonOffset(d.depth))
          .attr('fill', '#4CAF50')
          .attr('cursor', 'pointer')
          .on('click', (event, d: any) => {
            event.stopPropagation();
            handleAddChild(d.id);
          });

        nodes_g.append('text')
          .attr('x', d => getButtonOffset(d.depth))
          .attr('y', d => -getButtonOffset(d.depth) + getButtonRadius(d.depth) * 0.4)
          .attr('text-anchor', 'middle')
          .attr('fill', '#fff')
          .attr('pointer-events', 'none')
          .style('font-size', d => `${getButtonRadius(d.depth) * 1.2}px`)
          .text('+');

        // Add '-' button with adjusted positions for root node
        nodes_g.append('circle')
          .attr('r', d => getButtonRadius(d.depth))
          .attr('cx', d => -getButtonOffset(d.depth))
          .attr('cy', d => -getButtonOffset(d.depth))
          .attr('fill', '#f44336')
          .attr('cursor', 'pointer')
          .on('click', (event, d: any) => {
            event.stopPropagation();
            handleDeleteNode(d.id);
          });

        nodes_g.append('text')
          .attr('x', d => -getButtonOffset(d.depth))
          .attr('y', d => -getButtonOffset(d.depth) + getButtonRadius(d.depth) * 0.4)
          .attr('text-anchor', 'middle')
          .attr('fill', '#fff')
          .attr('pointer-events', 'none')
          .style('font-size', d => `${getButtonRadius(d.depth) * 1.2}px`)
          .text('-');
      } else {
        // Add expand/collapse button
        nodes_g.append('circle')
          .attr('class', 'expand-button')
          .attr('r', d => getResponsiveNodeRadius(d.depth, width) * 0.2) // Smaller relative to larger nodes
          .attr('cx', 0)
          .attr('cy', d => getResponsiveNodeRadius(d.depth, width) * 0.8)
          .attr('fill', d => {
            const hasChildren = familyData.nodes.some(node => node.parentId === d.id);
            return hasChildren ? '#4CAF50' : 'transparent';
          })
          .attr('cursor', 'pointer')
          .attr('opacity', d => {
            const hasChildren = familyData.nodes.some(node => node.parentId === d.id);
            return hasChildren ? 1 : 0;
          })
          .on('click', (event, d: any) => {
            event.stopPropagation();
            toggleNodeExpansion(d.id);
          });

        nodes_g.append('text')
          .attr('class', 'expand-icon')
          .attr('x', 0)
          .attr('y', d => getResponsiveNodeRadius(d.depth, width) * 0.8)
          .attr('text-anchor', 'middle')
          .attr('fill', '#fff')
          .attr('pointer-events', 'none')
          .style('font-size', d => `${getResponsiveNodeRadius(d.depth, width) * 0.3}px`)
          .text(d => {
            const hasChildren = familyData.nodes.some(node => node.parentId === d.id);
            return hasChildren ? (expandedNodes.has(d.id) ? '-' : '+') : '';
          });
      }

      simulation.on('tick', () => {
        // Update link positions
        links_g
          .attr('x1', (d: any) => d.source.x)
          .attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x)
          .attr('y2', (d: any) => d.target.y);

        // Update node positions
        nodes_g.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
      });

      function dragstarted(event: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      function dragended(event: any) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }

      return () => {
        simulation.stop();
      };
    };

    // Initial render
    updateDimensions();

    // Add window resize listener
    window.addEventListener('resize', updateDimensions);

    // Cleanup
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, [familyData, expandedNodes, isAdmin, isLoading]);

  if (isLoading) {
    return (
      <div className="w-full h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '0',
        right: '0',
        padding: '0 20px',
        zIndex: 1000,
        textAlign: 'center'
      }}>
        <h1 style={{
          color: 'white',
          fontSize: window.innerWidth < 768 ? '1.8rem' : '2.5rem',
          margin: '0',
          marginBottom: '5px',
          fontWeight: '600',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          fontFamily: 'Arial, sans-serif',
        }}>
          MAHİM AİLESİ
        </h1>
        <p style={{
          color: 'rgba(255,255,255,0.8)',
          fontSize: window.innerWidth < 768 ? '0.8rem' : '0.9rem',
          margin: '0',
          fontStyle: 'italic',
          textShadow: '0 1px 2px rgba(0,0,0,0.2)',
        }}>
          Berk & Burak Mahim tarafından geliştirilmiştir
        </p>
      </div>

      {!isAdmin && (
        <button
          onClick={showAllNodes}
          style={{
            position: 'absolute',
            top: window.innerWidth < 768 ? '90px' : '100px',
            right: window.innerWidth < 768 ? '10px' : '20px',
            padding: window.innerWidth < 768 ? '8px 16px' : '10px 20px',
            backgroundColor: 'rgba(147,112,219,0.8)',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            zIndex: 1000,
            backdropFilter: 'blur(5px)',
            fontSize: window.innerWidth < 768 ? '0.9rem' : '1rem',
          }}
        >
          Herkesi Gör
        </button>
      )}
      <svg
        ref={svgRef}
        style={{
          width: '100%',
          height: '100%',
          cursor: 'grab',
          backgroundColor: '#1a1b26'
        }}
      />
      {editingNode && (
        <EditModal
          node={editingNode}
          onSave={handleUpdateName}
          onCancel={() => setEditingNode(null)}
        />
      )}
    </div>
  );
};

export default FamilyTree;
