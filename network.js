// Código previo omitido por brevedad...

network.on("click", function (params) {
  const nodeInfo = document.getElementById("nodeInfo");

  if (params.nodes.length > 0) {
    const node = nodes.get(params.nodes[0]);
    const degree = edgeCount[node.id] || 0;
    let html = `<div class="node-info">`;

    if (node.image) {
      html += `<img src="${node.image}" alt="${node.id}" style="max-width: 150px;"><br>`;
    }

    html += `<h2>${node.id}</h2>`;

    const fieldsToShow = [
      { key: "life dates", label: "Life dates" },
      { key: "profession", label: "Profession" },
      { key: "author of", label: "Author of" },
      { key: "portrayed by", label: "Portrayed by" },
      { key: "Image source", label: "Image source" }
    ];

    fieldsToShow.forEach(field => {
      if (node[field.key]) {
        html += `<p><strong>${field.label}:</strong> ${node[field.key]}</p>`;
      }
    });

    const connections = [];
    edges.get().forEach(edge => {
      if (edge.from === node.id || edge.to === node.id) {
        const otherId = edge.from === node.id ? edge.to : edge.from;
        const otherNode = nodes.get(otherId);
        connections.push({ id: otherId, name: otherNode.id });
      }
    });

    const degreeCount = connections.length;
    html += `<p><strong>Connections:</strong> ${degreeCount}</p><ul>`;

    connections
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(conn => {
        html += `<li><a href="#" style="color:#66ccff" onclick="focusNode('${conn.id}')">${conn.name}</a></li>`;
      });

    html += `</ul></div>`;
    nodeInfo.innerHTML = html;

  } else if (params.edges.length > 0) {
    const edge = edges.get(params.edges[0]);
    const fromNode = nodesMap[edge.from];
    const toNode = nodesMap[edge.to];
    let html = `<h3>Connection</h3>`;
    html += `<div style="display:flex; align-items:center; gap:1rem;">`;
    if (fromNode?.image) {
      html += `<img src="${fromNode.image}" style="max-height:80px;">`;
    }
    if (toNode?.image) {
      html += `<img src="${toNode.image}" style="max-height:80px;">`;
    }
    html += `</div>`;

    const edgeFields = [
      { key: "relationship type", label: "Type of relationship" },
      { key: "correspondence", label: "Correspondence" },
      { key: "know each other since", label: "Known each other since" },
      { key: "portraits", label: "Portraits" },
      { key: "shared", label: "Shared" }
    ];

    edgeFields.forEach(field => {
      if (edge[field.key]) {
        html += `<p><strong>${field.label}:</strong> ${edge[field.key]}</p>`;
      }
    });

    nodeInfo.innerHTML = `<div class="node-info">${html}</div>`;
  }
});
