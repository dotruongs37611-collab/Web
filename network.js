document.addEventListener('DOMContentLoaded', async function () {
  try {
    const nodeInfo = document.getElementById('nodeInfo');

    const response = await fetch('goya_network.json');
    if (!response.ok) throw new Error('Error cargando datos');
    const data = await response.json();

    // Calcular conexiones y tamaño de nodos
    const edgeCount = {};
    data.edges.forEach(edge => {
      edgeCount[edge.from] = (edgeCount[edge.from] || 0) + 1;
      edgeCount[edge.to] = (edgeCount[edge.to] || 0) + 1;
    });

    data.nodes.forEach(node => {
      const degree = edgeCount[node.id] || 1;
      node.size = Math.min(30 + degree * 2, 60);
    });

    const nodes = new vis.DataSet(data.nodes.map(node => ({
      ...node,
      font: { size: 14, strokeWidth: 3, strokeColor: '#ffffff' },
      shape: node.image ? 'circularImage' : 'dot'
    })));

    const edges = new vis.DataSet(data.edges);

    const container = document.getElementById('network');
    const network = new vis.Network(container, { nodes, edges }, {
      nodes: {
        borderWidth: 2,
        color: {
          border: '#007bff',
          background: '#ffffff',
          highlight: { border: '#00bfff', background: '#e6f7ff' }
        }
      },
      edges: {
        color: { color: '#aaa', highlight: '#007bff' },
        arrows: { to: false }
      },
      physics: {
        enabled: true,
        solver: "repulsion",
        repulsion: {
          nodeDistance: 140,
          springLength: 130,
          springConstant: 0.03,
          damping: 0.25
        },
        stabilization: { iterations: 2500 }
      },
      interaction: {
        hover: true,
        tooltipDelay: 200
      }
    });

    // Búsqueda funcional
    const searchInput = document.getElementById('search');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        const term = this.value.toLowerCase();
        const matches = nodes.get({
          filter: node => (node.id || node.label).toLowerCase().includes(term)
        });

        if (matches.length === 1) {
          const nodeId = matches[0].id;
          network.selectNodes([nodeId]);
          network.focus(nodeId, {
            scale: 1.5,
            animation: { duration: 1000, easingFunction: 'easeInOutQuad' }
          });
        }
      });
    }

  } catch (error) {
    console.error("Error cargando o renderizando la red:", error);
  }
});
