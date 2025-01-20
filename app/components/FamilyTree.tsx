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

const FamilyTree = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [familyData, setFamilyData] = useState<{ nodes: FamilyNode[], links: FamilyLink[] }>({ 
    nodes: [{ id: '1', name: 'Beşo', children: [] }], 
    links: [] 
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<FamilyNode | null>(null);

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
          nodes: [{ id: '1', name: 'Beşo', children: [] }], 
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

  useEffect(() => {
    if (!svgRef.current || isLoading) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    if (error) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#ff0000')
        .text(error);
      return;
    }

    const simulation = d3.forceSimulation<any>(familyData.nodes)
      .force('link', d3.forceLink(familyData.links)
        .id((d: any) => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(50));

    const links = svg.append('g')
      .selectAll('line')
      .data(familyData.links)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-width', 2);

    const nodes = svg.append('g')
      .selectAll('g')
      .data(familyData.nodes)
      .enter()
      .append('g')
      .call(d3.drag<any, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    nodes.append('circle')
      .attr('r', 30)
      .attr('fill', '#69b3a2')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Add text elements for node names
    nodes.append('text')
      .text((d: FamilyNode) => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('fill', '#fff')
      .style('cursor', isAdmin ? 'pointer' : 'default')
      .on('dblclick', (event, d: FamilyNode) => {
        if (isAdmin) {
          setEditingNode(d);
        }
      });

    if (isAdmin) {
      // Add '+' button
      nodes.append('circle')
        .attr('r', 10)
        .attr('cx', 25)
        .attr('cy', -25)
        .attr('fill', '#4CAF50')
        .attr('cursor', 'pointer')
        .on('click', (event, d: any) => {
          event.stopPropagation();
          handleAddChild(d.id);
        });

      nodes.append('text')
        .attr('x', 25)
        .attr('y', -21)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fff')
        .attr('pointer-events', 'none')
        .text('+');

      // Add '-' button
      nodes.append('circle')
        .attr('r', 10)
        .attr('cx', -25)
        .attr('cy', -25)
        .attr('fill', '#f44336')
        .attr('cursor', 'pointer')
        .on('click', (event, d: any) => {
          event.stopPropagation();
          handleDeleteNode(d.id);
        });

      nodes.append('text')
        .attr('x', -25)
        .attr('y', -21)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fff')
        .attr('pointer-events', 'none')
        .text('-');
    }

    simulation.on('tick', () => {
      links
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      nodes.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
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
  }, [isAdmin, familyData, isLoading, error]);

  if (isLoading) {
    return (
      <div className="w-full h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-gray-900">
      <svg ref={svgRef} className="w-full h-full"></svg>
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
