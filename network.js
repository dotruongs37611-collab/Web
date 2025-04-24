function autoLinkNames(text, nodesMap) {
  if (!text || typeof text !== "string") return text;

  // Sustituye saltos de línea invisibles por espacio
  text = text.replace(/\r?\n|\r/g, " ");

  Object.keys(nodesMap).forEach(name => {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<![\\w>])(${escapedName})(?![\\w<])`, "g");
    text = text.replace(
      regex,
      `<a href="#" style="color:#66ccff" onclick="focusNode('${nodesMap[name].id}')">$1</a>`
    );
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
        size: Math.min(42 + degree * 1.5, 100),
        font: { size: 18, strokeWidth: 3, strokeColor: '#ffffff' },
        color: { border: '#2B7CE9' },
          borderWidth: 2,
        shape: node.image ? 'circularImage' : 'dot'
      };
      if (node.image) config.image = node.image;
      nodesMap[node.id] = config;
      return config;
    }));

      const edges = new vis.DataSet(data.edges.map(edge => {
        const level = edge.connection_level || "direct";
        return {
          ...edge,
          color: level === "secondary" ? "#FFD700" : "lightgray", // dorado para secondary
          width: 2
        };
      }));

    // Mostrar número de nodos y edges
    document.getElementById("networkStats").textContent = `Nodes: ${nodes.length} | Connections: ${edges.length}`;

    let lastHighlightedNode = null;
    let lastHighlightedNodes = [];
    
    function clearHighlights() {
      if (lastHighlightedNode) {
        const n = nodes.get(lastHighlightedNode);
        nodes.update({ id: lastHighlightedNode, color: { ...n.color, border: '#2B7CE9' }, borderWidth: 2 });
        lastHighlightedNode = null;
      }
      if (lastHighlightedNodes.length > 0) {
        lastHighlightedNodes.forEach(id => {
          const n = nodes.get(id);
          nodes.update({ id, color: { ...n.color, border: '#2B7CE9' }, borderWidth: 2 });
        });
        lastHighlightedNodes = [];
      }
    }

    const container = document.getElementById('network');
    const network = new vis.Network(container, { nodes, edges }, {
      nodes: { borderWidth: 2 },
      edges: { color: 'lightgray' },
      physics: {
        solver: 'forceAtlas2Based',
        stabilization: true,
        forceAtlas2Based: {
          gravitationalConstant: -90,
          centralGravity: 0.01,
          springLength: 140,
          springConstant: 0.08,
          avoidOverlap: 1 // 👈 clave para que no se solapen
        }
      }
    });
    network.once("stabilizationIterationsDone", function () {
      setTimeout(() => {
        network.setOptions({ physics: false });
        network.fit({ animation: true, minZoomLevel: 0.5 });
      }, 2000); // Espera 2 segundos más
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

        clearHighlights();
        nodes.update({ id: node.id, color: { ...node.color, border: 'red' }, borderWidth: 4 });
        lastHighlightedNode = node.id;

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
          { key: "siblings", label: "Siblings" },
          { key: "friends", label: "Friends" },
          { key: "rivals", label: "Rivals" },
          { key: "partners/lovers", label: "Partners/lovers" },
          { key: "sales", label: "Sales" },
          { key: "visits the Prado Museum", label: "Visits the Prado Museum" },
          { key: "works as", label: "Works as" },
          { key: "works for", label: "Works for" },
          { key: "considered as", label: "Considered as" },
          { key: "meets", label: "Meets" },
          { key: "address", label: "Address" },
          { key: "studies in", label: "Studies in" },
          { key: "students", label: "Students" },
          { key: "masters", label: "Masters" },
          { key: "follower of", label: "Follower of" },
          { key: "collector of", label: "Collector of" },
          { key: "founder of", label: "Founder of" },
          { key: "patrons", label: "Patrons" },
          { key: "Image source", label: "Image source" },
          { key: "commissions Goya with", label: "Commissions Goya with" },
          { key: "link to Goya's work", label: "Link to Goya's work" },
          { key: "writes about Goya", label: "Writes about Goya" },
          { key: "mentions of Goya", label: "Mentions of Goya" },
          { key: "influence of Goya", label: "Influence of Goya" },
          { key: "collector of Goya's works", label: "Collector of Goya's works" },
          { key: "disseminates Goya's works", label: "Disseminates Goya's works" },
          { key: "knows Goya's works", label: "Knows Goya's works" },
          { key: "mentions the Prado commentaries", label: "Mentions the Prado commentaries" },
          { key: "shows Goya", label: "Shows Goya" },
          { key: "discovers Goya's works", label: "Discovers Goya's works" },
          { key: "mentioned in the French press", label: "Mentioned in the French press" },
          { key: "pseudonyms", label: "Pseudonyms" },
          { key: "archives", label: "Archives" },
          { key: "Bibliography", label: "Bibliography" },
          { key: "bibliography", label: "Bibliography" },
          { key: "websites", label: "Websites" },
          { key: "nationality", label: "Nationality" },
          { key: "full name", label: "Full name" },
          { key: "also known as", label: "Also known as" },
          { key: "born in", label: "Born in" },
          { key: "collection", label: "Collection" },
          { key: "collaborates with", label: "Collaborates with" },
          { key: "patronage", label: "Patronage" },
          { key: "aristocratic titles", label: "Aristocratic titles" },
          { key: "member of", label: "Member of" },
          { key: "curiosities", label: "Curiosities" },
          { key: "correspondence", label: "Correspondence" },
          { key: "political views", label: "Political views" },
          { key: "influenced by", label: "Influenced by" },
          { key: "decorations/awards", label: "Decorations/awards" },
          { key: "image source", label: "Image source" }
        ];

        const nodesMapByLabel = {};
        nodes.get().forEach(n => nodesMapByLabel[n.label] = n);
        
        fieldsToShow.forEach(field => {
          if (node[field.key]) {
            let value = node[field.key];
            let htmlText;
        
            if (Array.isArray(value)) {
              const processedItems = value.map(item => {
                const replacedText = item.replace(/([^\[\]]+)\s*\[(https?:\/\/[^\]\s]+)\]/g, (match, text, url) => {
                  return `<a href="${url}" target="_blank" style="color:#66ccff;">${text.trim()}</a>`;
                });
                return `<li>${autoLinkNames(replacedText, nodesMapByLabel)}</li>`;
              });
              htmlText = `<ul style="margin-top: 0.3rem; margin-bottom: 0.3rem; padding-left: 1.2rem;">${processedItems.join("")}</ul>`;

            } else {
              value = value.replace(/([^\[\]]+)\s*\[(https?:\/\/[^\]\s]+)\]/g, (match, text, url) => {
                return `<a href="${url}" target="_blank" style="color:#66ccff;">${text.trim()}</a>`;
              });
              htmlText = autoLinkNames(value, nodesMapByLabel);
            }
        
            html += `<p style="margin-top:0.3rem;"><strong>${field.label}:</strong> ${htmlText}</p>`;
          }
        });

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
        clearHighlights();
        const edge = edges.get(params.edges[0]);
        if (!edge) return;
      
        const fromNode = nodes.get(edge.from);
        const toNode = nodes.get(edge.to);
      
        if (fromNode && toNode) {
          nodes.update([
            { id: fromNode.id, color: { border: 'red' }, borderWidth: 4 },
            { id: toNode.id, color: { border: 'red' }, borderWidth: 4 }
          ]);
          lastHighlightedNodes = [fromNode.id, toNode.id];
        }
      
        // ❌ Aquí viene el error: ya declaraste fromNode y toNode arriba
        // 🔁 Solución: elimina "const"
        const fromNodeMap = nodesMap[edge.from];
        const toNodeMap = nodesMap[edge.to];


        let html = `<div style="display:flex; align-items:center; gap:1rem; padding-bottom:1rem;">`;

        if (fromNodeMap?.image) {
          html += `<img src="${fromNodeMap.image}" style="max-height:80px;">`;
        }
        if (toNodeMap?.image) {
          html += `<img src="${toNodeMap.image}" style="max-height:80px;">`;
        }

        html += `</div>`;
        html += `<h3>Connection</h3>`;
        html += `<p><strong>Between:</strong> <a href="#" style="color:#66ccff" onclick="focusNode('${fromNodeMap.id}')">${fromNodeMap.id}</a> and <a href="#" style="color:#66ccff" onclick="focusNode('${toNodeMap.id}')">${toNodeMap.id}</a></p>`;

        const edgeFields = [
          { key: "relationship type", label: "Type of relationship" },
          { key: "connection_level", label: "Type of connection" },
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
          { key: "link to Goya", label: "Link to Goya" },
          { key: "copies after Goya", label: "Copies after Goya" },
          { key: "commissions Goya with", label: "Commissions Goya with" },
          { key: "writes about Goya", label: "Writes about Goya" },
          { key: "mentions of Goya", label: "Mentions of Goya" },
          { key: "quotations of Goya", label: "Quotations of Goya" },
          { key: "influence of Goya", label: "Influence of Goya" },
          { key: "collector of Goya's works", label: "Collector of Goya's works" },
          { key: "disseminates Goya's works", label: "Disseminates Goya's works" },
          { key: "discovers Goya's works", label: "Discovers Goya's works" },
          { key: "knows Goya's works", label: "Knows Goya's works" },
          { key: "mentions the Prado commentaries", label: "Mentions the Prado commentaries" },
          { key: "shows Goya", label: "Shows Goya" },
          { key: "artworks influenced by Goya", label: "Artworks influenced by Goya" },
          { key: "artworks bought/sold/given", label: "Artworks bought/sold/given" },
          { key: "bibliography", label: "Bibliography" },
          { key: "comparisons", label: "Comparisons" },
          { key: "criticism", label: "Criticism" },
          { key: "rivalry", label: "Rivalry" },
          { key: "portraits", label: "Portraits" }
        ];

        edgeFields.forEach(field => {
          if (edge[field.key]) {
            let value = edge[field.key];
            let htmlText;
        
            if (Array.isArray(value)) {
              const processedItems = value.map(item => {
                const replacedText = item.replace(/([^\[\]]+)\s*\[(https?:\/\/[^\]\s]+)\]/g, (match, text, url) => {
                  return `<a href="${url}" target="_blank" style="color:#66ccff;">${text.trim()}</a>`;
                });
                return `<li>${autoLinkNames(replacedText, nodesMap)}</li>`;
              });
              htmlText = `<ul style="margin-top: 0.3rem; margin-bottom: 0.3rem; padding-left: 1.2rem;">${processedItems.join("")}</ul>`;
            } else {
              value = value.replace(/([^\[\]]+)\s*\[(https?:\/\/[^\]\s]+)\]/g, (match, text, url) => {
                return `<a href="${url}" target="_blank" style="color:#66ccff;">${text.trim()}</a>`;
              });
              htmlText = autoLinkNames(value, nodesMap);
        
              const urlMatch = typeof htmlText === "string" ? htmlText.match(/https?:\/\/[^\s)]+/) : null;
              if (urlMatch) {
                const url = urlMatch[0];
                htmlText = htmlText.replace(` (${url})`, '').replace(url, '').trim();
                htmlText += ` <a href="${url}" target="_blank" style="color:#66ccff;">[source]</a>`;
              }
            }
        
            html += Array.isArray(value)
              ? `<div style="margin-top:0.3rem;"><strong>${field.label}:</strong>${htmlText}</div>`
              : `<p style="margin-top:0.3rem;"><strong>${field.label}:</strong> ${htmlText}</p>`;
          }
        });

        document.getElementById("nodeInfo").innerHTML = html;
      }

      if (params.nodes.length === 0 && params.edges.length === 0) {
        clearHighlights();
      }

    });

    window.focusNode = function (nodeId) {
      clearHighlights();
    
      network.focus(nodeId, {
        scale: 1.2,
        animation: { duration: 500 }
      });
    
      nodes.update({ id: nodeId, color: { border: 'red' }, borderWidth: 4 });
      lastHighlightedNode = nodeId;
    };

    // Búsqueda funcional
    const searchInput = document.getElementById('search');
    const searchButton = document.getElementById('searchButton');

    // Replace the existing searchButton event listener with this:
    searchButton.addEventListener('click', () => {
      const query = searchInput.value.trim().toLowerCase();
      if (!query) return;
    
      // Clear previous highlights
      clearHighlights();
    
      // 1. Buscar primero en nodos (prioridad)
      let found = data.nodes.find(n =>
        n.id.toLowerCase() === query || 
        (typeof n.label === 'string' && n.label.toLowerCase() === query)
      );
      
      // 2. Si no hay coincidencia exacta, buscar por startsWith
      if (!found) {
        found = data.nodes.find(n =>
          n.id.toLowerCase().startsWith(query) || 
          (typeof n.label === 'string' && n.label.toLowerCase().startsWith(query))
        );
      }
      
      // 3. Si aún no, buscar por contiene
      if (!found) {
        found = data.nodes.find(n =>
          n.id.toLowerCase().includes(query) || 
          (typeof n.label === 'string' && n.label.toLowerCase().includes(query))
        );
      }
      
      // 4. Si no está en id o label, buscar en otros campos del nodo
      if (!found) {
        found = data.nodes.find(n =>
          Object.entries(n).some(([key, value]) =>
            typeof value === 'string' &&
            !key.includes('image') &&
            !value.includes('PFayos') &&
            value.toLowerCase().includes(query)
          )
        );
      }
      
      // 5. Si aún no hay nodo, buscar en los edges
      if (!found) {
        const matchingEdge = data.edges.find(edge =>
          Object.entries(edge).some(([key, value]) =>
            typeof value === 'string' &&
            !key.includes('image') &&
            value.toLowerCase().includes(query)
          )
        );
      
        if (matchingEdge) {
          const edge = edges.get().find(e =>
            e.from === matchingEdge.from && e.to === matchingEdge.to
          );
          
          if (edge) {
            network.selectEdges([edge.id]);
            network.emit('click', { edges: [edge.id], nodes: [] });
            return;
          }
        }
      }
      
      // 6. Mostrar resultado o alerta
      if (found) {
        focusNode(found.id);
      } else {
        alert("No match found.");
      }
    });

    // Add Enter key support
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        searchButton.click();
      }
    });

    document.getElementById('professionFilter').addEventListener('change', function () {
  const selected = this.value.toLowerCase();

  // Quitar anteriores
  clearHighlights();

  if (!selected) return;

  const matchingNodes = [];

      nodes.get().forEach(n => {
        const profession = (n["profession"] || "").toLowerCase();
        if (profession.includes(selected)) {
          nodes.update({ id: n.id, color: { ...n.color, border: 'red' }, borderWidth: 4 });
          matchingNodes.push(n.id);
        }
      });
    
      lastHighlightedNodes = matchingNodes;
    });

    document.getElementById('nationalityFilter').addEventListener('change', function () {
      const selected = this.value.toLowerCase();
    
      clearHighlights();
    
      if (!selected) return;
    
      const matchingNodes = [];
    
      nodes.get().forEach(n => {
        const nationality = (n["nationality"] || "").toLowerCase();
        if (nationality.includes(selected)) {
          nodes.update({ id: n.id, color: { ...n.color, border: 'red' }, borderWidth: 4 });
          matchingNodes.push(n.id);
        }
      });
    
      lastHighlightedNodes = matchingNodes;
    });

    
  } catch (err) {
    console.error("Error cargando o renderizando la red:", err);
  }
});
