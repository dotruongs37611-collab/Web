
document.addEventListener('DOMContentLoaded', async function () {
  try {
    const nodeInfo = document.getElementById('nodeInfo');

    // 1. Cargar datos
    const response = await fetch('goya_network.json');
    if (!response.ok) throw new Error('Error cargando datos');
    const data = await response.json();

    // 2. Calcular tamaño proporcional por número de conexiones
    const edgeCount = {};
    data.edges.forEach(edge => {
      edgeCount[edge.from] = (edgeCount[edge.from] || 0) + 1;
      edgeCount[edge.to] = (edgeCount[edge.to] || 0) + 1;
    });

    data.nodes.forEach(node => {
      const degree = edgeCount[node.id] || 1;
      node.size = Math.min(10 + degree * 2, 60); // tamaño escalado
    });

    // 3. Crear datasets
    const nodes = new vis.DataSet(data.nodes.map(node => {
      const nodeConfig = {
        ...node,
        font: { size: 14, strokeWidth: 3, strokeColor: '#ffffff' },
        shape: node.image ? 'circularImage' : 'dot'
      };
      return nodeConfig;
    }));

    const edges = new vis.DataSet(data.edges);

    // 4. Crear red
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
          nodeDistance: 250,
          springLength: 300,
          springConstant: 0.05,
          damping: 0.2
        },
        stabilization: { iterations: 2500 }
      },
      interaction: {
        hover: true,
        tooltipDelay: 200
      }
    });

    // 5. Evento de clic en nodo
    network.on('click', function (params) {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const node = nodes.get(nodeId);
        const connections = network.getConnectedNodes(nodeId);

        let infoHTML = `
          <h2>${node.id || node.label}</h2>
          ${node.image ? `<img src="${node.image}" alt="${node.label}" style="max-width:200px; float:left; margin-right:15px; margin-bottom:15px;">` : ''}
          ${node.image_source ? `<p><em>Image source:</em> ${node.image_source}</p>` : ''}
        `;

        Object.entries(node).forEach(([key, value]) => {
          if (!['id', 'label', 'image', 'shape', 'font', 'size', 'image_source'].includes(key)) {
            const formattedValue = Array.isArray(value) ? value.join(', ') : value;
            infoHTML += `<p><strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong> ${formattedValue}</p>`;
          }
        });

        infoHTML += `
          <div style="clear:both;"></div>
          <h3>Connections (${connections.length}):</h3>
          <ul>
            ${connections.map(id => {
              const connected = nodes.get(id);
              return `<li><a href="#" class="connection-link" data-id="${id}">${connected.id || connected.label}</a></li>`;
            }).join('')}
          </ul>
        `;

        nodeInfo.innerHTML = infoHTML;

        document.querySelectorAll('.connection-link').forEach(link => {
          link.addEventListener('click', function (event) {
            event.preventDefault();
            const targetId = this.getAttribute('data-id');
            network.selectNodes([targetId]);
            network.focus(targetId, {
              scale: 1.5,
              animation: { duration: 1500, easingFunction: 'easeInOutQuad' }
            });

            const node = nodes.get(targetId);
            const connections = network.getConnectedNodes(targetId);

            let infoHTML = `
              <h2>${node.id || node.label}</h2>
              ${node.image ? `<img src="${node.image}" alt="${node.label}" style="max-width:200px; float:left; margin-right:15px; margin-bottom:15px;">` : ''}
              ${node.image_source ? `<p><em>Image source:</em> ${node.image_source}</p>` : ''}
            `;

            Object.entries(node).forEach(([key, value]) => {
              if (!['id', 'label', 'image', 'shape', 'font', 'size', 'image_source'].includes(key)) {
                const formattedValue = Array.isArray(value) ? value.join(', ') : value;
                infoHTML += `<p><strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong> ${formattedValue}</p>`;
              }
            });

            infoHTML += `
              <div style="clear:both;"></div>
              <h3>Connections (${connections.length}):</h3>
              <ul>
                ${connections.map(id => {
                  const connected = nodes.get(id);
                  return `<li><a href="#" class="connection-link" data-id="${id}">${connected.id || connected.label}</a></li>`;
                }).join('')}
              </ul>
            `;

            nodeInfo.innerHTML = infoHTML;

            document.querySelectorAll('.connection-link').forEach(link => {
              link.addEventListener('click', arguments.callee);
            });
          });
        });
      }
    });

    // 6. Evento de clic en edges
    network.on('selectEdge', function (params) {
      if (params.edges.length > 0) {
        const edgeId = params.edges[0];
        const edge = edges.get(edgeId);

        let edgeInfo = `<h2>Connection</h2>`;
        Object.entries(edge).forEach(([key, value]) => {
          if (!['from', 'to', 'id', 'label'].includes(key)) {
            edgeInfo += `<p><strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong> ${value}</p>`;
          }
        });

        edgeInfo += `
          <p><strong>Between:</strong> ${nodes.get(edge.from)?.id || nodes.get(edge.from)?.label} and ${nodes.get(edge.to)?.id || nodes.get(edge.to)?.label}</p>
          ${nodes.get(edge.from)?.image ? `<img src="${nodes.get(edge.from).image}" alt="${nodes.get(edge.from).label}" style="max-width:120px; margin-right:10px;">` : ''}
          ${nodes.get(edge.to)?.image ? `<img src="${nodes.get(edge.to).image}" alt="${nodes.get(edge.to).label}" style="max-width:120px;">` : ''}
        `;

        nodeInfo.innerHTML = edgeInfo;
      }
    });

  } catch (error) {
    console.error("Error cargando o renderizando la red:", error);
  }
});
