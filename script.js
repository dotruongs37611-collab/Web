
async function loadGraph() {
  const response = await fetch("data/goya-network.gexf");
  const gexfText = await response.text();
  const parser = new DOMParser();
  const xml = parser.parseFromString(gexfText, "application/xml");
  const graph = window.graphologyGEXF.parse(xml);

  const container = document.getElementById("sigma-container");
  const renderer = new sigma.Sigma(graph, container);

  renderer.on("clickNode", ({ node }) => {
    const data = graph.getNodeAttributes(node);
    showInfo("Nodo", node, data);
  });

  renderer.on("clickEdge", ({ edge }) => {
    const data = graph.getEdgeAttributes(edge);
    showInfo("Conexión", edge, data);
  });
}

function showInfo(type, id, data) {
  const panel = document.getElementById("info-panel");
  panel.innerHTML = `<h3>${type}: ${id}</h3>`;

  if (data.image) {
    panel.innerHTML += `<img src="${data.image}" alt="${id}" style="width: 100%; max-height: 200px; object-fit: cover;"><br>`;
  }

  for (const key in data) {
    if (key !== "image") {
      panel.innerHTML += `<strong>${key}:</strong> ${data[key]}<br>`;
    }
  }
}

loadGraph();
