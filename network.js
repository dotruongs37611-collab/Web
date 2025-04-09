
document.addEventListener('DOMContentLoaded', async function () {
  try {
    const nodeInfo = document.getElementById('nodeInfo');

    const response = await fetch('goya_network.json');
    if (!response.ok) throw new Error('Error cargando datos');
    const data = await response.json();

    const edgeCount = {};
    data.edges.forEach(edge => {
      edgeCount[edge.from] = (edgeCount[edge.from] || 0) + 1;
      edgeCount[edge.to] = (edgeCount[edge.to] || 0) + 1;
    });

    const nodesWithImages = data.nodes.map(node => {
      const degree = edgeCount[node.id] || 1;
      const config = {
        ...node,
        size: Math.min(20 + degree * 2, 60),
        font: { size: 14, strokeWidth: 3, strokeColor: '#ffffff' },
        shape: node.image ? 'circularImage' : 'dot'
      };
      if (node.image) config.image = node.image;
      return config;
    });

    const nodes = new vis.DataSet(nodesWithImages);
    const edges = new vis.DataSet(data.edges);

    const container = document.getElementById('network');
    const network = new vis.Network(container, { nodes, edges }, {
      nodes: { borderWidth: 2 },
      edges: { color: 'lightgray' },
      physics: { solver: 'forceAtlas2Based', stabilization: true }
    });

    network.on("click", function (params) {
      if (params.nodes.length > 0) {
        const node = nodes.get(params.nodes[0]);
        let html = `<h3>${node.label}</h3>`;
        for (let key in node) {
          if (!['id', 'label', 'image', 'shape', 'font', 'size'].includes(key)) {
            const label = key.charAt(0).toUpperCase() + key.slice(1);
            html += `<p><strong>${label}:</strong> ${node[key]}</p>`;
          }
        }
        nodeInfo.innerHTML = html;
      } else if (params.edges.length > 0) {
        const edge = edges.get(params.edges[0]);
        let html = `<h3>Connection</h3>`;
        for (let key in edge) {
          if (!['from', 'to', 'id'].includes(key)) {
            const label = key.charAt(0).toUpperCase() + key.slice(1);
            html += `<p><strong>${label}:</strong> ${edge[key]}</p>`;
          }
        }
        html += `<p><strong>Between:</strong> ${edge.from} and ${edge.to}</p>`;
        nodeInfo.innerHTML = html;
      } else {
        nodeInfo.innerHTML = "<p>Click a node or edge to see more information here.</p>";
      }
    });

  } catch (err) {
    console.error("Error cargando o renderizando la red:", err);
  }
});
