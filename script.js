// Obtener los datos del archivo GEXF desde GitHub
const gexfUrl = 'https://raw.githubusercontent.com/PFayosP/GoyaNetworkWeb/main/data/red-goya.gexf';

// Cargar el archivo GEXF
fetch(gexfUrl)
  .then(response => response.text())
  .then(data => {
    // Crear el grafo a partir del archivo GEXF
    const graph = graphologyGexf.parse(data);

    // Crear un objeto Sigma y cargar el grafo
    const sigmaInstance = new sigma('sigma-container');

    // Cargar el grafo en Sigma.js
    sigmaInstance.graph.fromGraphology(graph);

    // Refrescar el renderizado de la red
    sigmaInstance.refresh();

    // Mostrar información al hacer clic en un nodo
    sigmaInstance.bind('clickNode', function(event) {
      const node = event.data.node;
      const infoPanel = document.getElementById('info-panel');
      infoPanel.innerHTML = `
        <h3>${node.label}</h3>
        <p>Fecha de nacimiento: ${node.attributes['date of birth']}</p>
        <p>Fecha de muerte: ${node.attributes['date of death']}</p>
        <p>Profesión: ${node.attributes.profession}</p>
        <p>Obras destacadas: ${node.attributes['notableWorks']}</p>
      `;
    });

    // Mostrar información al hacer clic en una relación
    sigmaInstance.bind('clickEdge', function(event) {
      const edge = event.data.edge;
      const infoPanel = document.getElementById('info-panel');
      infoPanel.innerHTML = `
        <h3>Relación: ${edge.attributes.type}</h3>
        <p>Descripción: ${edge.attributes.description}</p>
      `;
    });
  })
