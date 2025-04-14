function autoLinkNames(text, nodesMap) {
  if (!text || typeof text !== "string") return text;

  const knownNames = Object.keys(nodesMap);

  // Recorre todos los nombres conocidos en la red
  knownNames.forEach(name => {
    // Crear expresión regular con bordes de palabra
    const regex = new RegExp(`\\b${name}\\b`, 'g');

    // Reemplazar solo si el nombre exacto está en el texto
    text = text.replace(regex, `<a href="#" style="color:#66ccff" onclick="focusNode('${name}')">${name}</a>`);
  });

  return text;
}

document.addEventListener('DOMContentLoaded', async function () {
  try {
    const nodeInfo = document.getElementById('nodeInfo');
    nodeInfo.style.maxHeight = '810px';
    nodeInfo.style.overflowY = 'auto';

    const response = await fetch('goya_network.json');
    if (!response.ok) throw new Error('Error cargando datos');
    const data = await response.json();

    const edgeCount = {};
    data.edges.forEach(edge => {
      edgeCount[edge.from] = (edgeCount[edge.from] || 0) + 1;
      edgeCount[edge.to] = (edgeCount[edge.to] || 0) + 1;
    });

    const nodesMap = {};
    const nodes = new vis.DataSet(data.nodes.map(node => {
      const degree = edgeCount[node.id] || 1;
      const config = {
        ...node,
        size: Math.min(28 + degree * 2.5, 70),
        font: { size: 18, strokeWidth: 3, strokeColor: '#ffffff' },
        shape: node.image ? 'circularImage' : 'dot'
      };
      if (node.image) config.image = node.image;
      nodesMap[node.id] = config;
      return config;
    }));

    const edges = new vis.DataSet(data.edges);

    const container = document.getElementById('network');
    const network = new vis.Network(container, { nodes, edges }, {
      nodes: { borderWidth: 2 },
      edges: { color: 'lightgray' },
      physics: {
        solver: 'forceAtlas2Based',
        stabilization: true,
        forceAtlas2Based: {
          gravitationalConstant: -50,
          centralGravity: 0.01,
          springLength: 150,
          springConstant: 0.08,
          avoidOverlap: 1 // 👈 clave para que no se solapen
        }
      }
    });
    network.once("stabilizationIterationsDone", function () {
      network.setOptions({ physics: false });         // ❄️ Detiene el movimiento
      network.fit({ animation: true });               // 🎯 Centra y ajusta zoom
    });
    network.on("dragStart", function () {
      network.setOptions({ physics: { enabled: true } });
    });

    network.on("dragEnd", function () {
      setTimeout(() => {
        network.setOptions({ physics: false });
      }, 1000); // espera 1 segundo para que se relaje
    });

    network.on("click", function (params) {
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
          { key: "editor of", label: "Editor of" },
          { key: "writes in", label: "Writes in" },
          { key: "in Madrid", label: "In Madrid" },
          { key: "in Spain", label: "In Spain" },
          { key: "in Paris", label: "In Paris" },
          { key: "in France", label: "In France" },
          { key: "in Italy", label: "In Italy" },
          { key: "participates in", label: "Participates in" },
          { key: "married to", label: "Married to" },
          { key: "children", label: "Children" },
          { key: "parents", label: "Parents" },
          { key: "commissions Goya with", label: "Commissions Goya with" },
          { key: "sales", label: "Sales" },
          { key: "visits the Prado Museum", label: "Visits the Prado Museum" },
          { key: "works as", label: "Works as" },
          { key: "works for", label: "Works for" },
          { key: "meets", label: "Meets" },
          { key: "address", label: "Address" },
          { key: "studied in", label: "Studied in" },
          { key: "students", label: "Students" },
          { key: "masters", label: "Masters" },
          { key: "follower of", label: "Follower of" },
          { key: "collector of", label: "Collector of" },
          { key: "founder of", label: "Founder of" },
          { key: "patrons", label: "Patrons" },
          { key: "Image source", label: "Image source" },
          { key: "link to Goya's work", label: "Link to Goya's work" },
          { key: "writes about Goya", label: "Writes about Goya" },
          { key: "mentions Goya", label: "Mentions Goya" },
          { key: "influence of Goya's work", label: "Influence of Goya's work" },
          { key: "collector of Goya's work", label: "Collector of Goya's work" },
          { key: "knows Goya's work since", label: "knows Goya's work since" },
          { key: "mentions the Prado commentaries", label: "Mentions the Prado commentaries" },
          { key: "shows Goya", label: "Shows Goya" },
          { key: "mentioned in the French press", label: "Mentioned in the French press" },
          { key: "pseudonym", label: "Pseudonym" },
          { key: "archives", label: "Archives" },
          { key: "bibliography", label: "Bibliography" },
          { key: "nationality", label: "Nationality" },
          { key: "full name", label: "Full name" },
          { key: "also known as", label: "Also known as" },
          { key: "born in", label: "Born in" },
          { key: "collection", label: "Collection" },
          { key: "collaborates with", label: "Collaborates with" },
          { key: "patronage", label: "Patronage" },
          { key: "aristocratic titles", label: "Aristocratic titles" },
          { key: "image source", label: "Image source" }
        ];

        fieldsToShow.forEach(field => {
          if (node[field.key]) {
            let value = node[field.key];
        
          // Detectar si hay URL al final
          const urlMatch = value.match(/https?:\/\/[^\s)]+/);
          if (urlMatch) {
            const url = urlMatch[0];
            value = value.replace(` (${url})`, '').replace(url, '').trim();
            value += ` <a href="${url}" target="_blank" style="color:#66ccff;">[source]</a>`;
          }
        
          const nodesMap = {};
          nodes.get().forEach(n => nodesMap[n.label] = n);
  
          const htmlText = autoLinkNames(value, nodesMap);
          html += `<p><strong>${field.label}:</strong> ${htmlText}</p>`;

        const connections = [];
        edges.get().forEach(edge => {
          if (edge.from === node.id || edge.to === node.id) {
            const otherId = edge.from === node.id ? edge.to : edge.from;
            const otherNode = nodes.get(otherId);
            if (otherNode) {
              connections.push({ id: otherId, name: otherNode.id });
            }
          }
        });

        const degreeCalc = connections.length;
        html += `<p><strong>Connections:</strong> ${degreeCalc}</p><ul>`;

        connections
          .sort((a, b) => a.name.localeCompare(b.name))
          .forEach(conn => {
            html += `<li><a href="#" style="color:#66ccff" onclick="focusNode('${conn.id}')">${conn.name}</a></li>`;
          });

        html += `</ul></div>`;
        document.getElementById("nodeInfo").innerHTML = html;

      } else if (params.edges.length > 0) {
        const edge = edges.get(params.edges[0]);
        if (!edge) return;

        const fromNode = nodesMap[edge.from];
        const toNode = nodesMap[edge.to];

        let html = `<div style="display:flex; align-items:center; gap:1rem; padding-bottom:1rem;">`;

        if (fromNode?.image) {
          html += `<img src="${fromNode.image}" style="max-height:80px;">`;
        }
        if (toNode?.image) {
          html += `<img src="${toNode.image}" style="max-height:80px;">`;
        }

        html += `</div>`;
        html += `<h3>Connection</h3>`;
        html += `<p><strong>Between:</strong> <a href="#" style="color:#66ccff" onclick="focusNode('${fromNode.id}')">${fromNode.id}</a> and <a href="#" style="color:#66ccff" onclick="focusNode('${toNode.id}')">${toNode.id}</a></p>`;

        const edgeFields = [
          { key: "relationship type", label: "Type of relationship" },
          { key: "correspondence", label: "Correspondence" },
          { key: "know each other since", label: "Know each other since" },
          { key: "they met", label: "They met" },
          { key: "shared", label: "Shared" },
          { key: "mentions", label: "Mentions" },
          { key: "collaborations", label: "Collaborations" },
          { key: "curiosities", label: "Curiosities" },
          { key: "children", label: "Children" },
          { key: "married in", label: "Married in" },
          { key: "link to Goya's work", label: "Link to Goya's work" },
          { key: "portraits", label: "Portraits" }
        ];

        edgeFields.forEach(field => {
          if (edge[field.key]) {
            let value = autoLinkNames(edge[field.key], nodesMap);
            const urlMatch = value.match(/https?:\/\/[^\s)]+/);
            if (urlMatch) {
              const url = urlMatch[0];
              value = value.replace(` (${url})`, '').replace(url, '').trim();
              value += ` <a href="${url}" target="_blank" style="color:#66ccff;">[source]</a>`;
            }

            html += `<p><strong>${field.label}:</strong> ${value}</p>`;
          }
        });

        document.getElementById("nodeInfo").innerHTML = html;
      }
    });

    window.focusNode = function (nodeId) {
      network.focus(nodeId, {
        scale: 1.2,
        animation: { duration: 500 }
      });

      nodes.update({ id: nodeId, color: { border: 'red' }, borderWidth: 4 });
    };

    // Búsqueda funcional
    const searchInput = document.getElementById('search');
    const searchButton = document.getElementById('searchButton');

    searchButton.addEventListener('click', () => {
const query = searchInput.value.trim().toLowerCase();
  if (!query) return;
  
      // 1. Buscar coincidencia exacta en label
    let found = data.nodes.find(n =>
      typeof n.label === 'string' &&
      n.label.toLowerCase() === query
    );
    
    // 2. Buscar label que empiece por query
    if (!found) {
      found = data.nodes.find(n =>
        typeof n.label === 'string' &&
        n.label.toLowerCase().startsWith(query)
      );
    }
    
    // 3. Buscar label que contenga query
    if (!found) {
      found = data.nodes.find(n =>
        typeof n.label === 'string' &&
        n.label.toLowerCase().includes(query)
      );
    }
    
    // 4. Buscar en cualquier campo del nodo
    if (!found) {
      found = data.nodes.find(n =>
        Object.values(n).some(value =>
          typeof value === 'string' &&
          value.toLowerCase().includes(query)
        )
      );
    }

      // 5. Mostrar resultado
      if (found) {
        focusNode(found.id);
      } else {
        alert("No match found.");
      }
    });

    searchInput.addEventListener('keyup', function(event) {
      if (event.key === 'Enter') {
        searchButton.click();
      }
    });

    
  } catch (err) {
    console.error("Error cargando o renderizando la red:", err);
  }
});
