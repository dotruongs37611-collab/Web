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

// Add these two functions at the top of network.js
window.search = function() {
  const searchInput = document.getElementById('searchInput').value.trim().toLowerCase();
  if (!searchInput) return;

  // Find matching nodes
  const matchingNodes = nodes.get().filter(node => 
    node.id.toLowerCase().includes(searchInput) || 
    (node.label && node.label.toLowerCase().includes(searchInput))
  );

  if (matchingNodes.length > 0) {
    // Focus on first match
    network.focus(matchingNodes[0].id, { animation: true });
    // Select the node
    network.selectNodes([matchingNodes[0].id]);
    // Show node info
    network.emit('click', { nodes: [matchingNodes[0].id] });
  } else {
    alert('No matching nodes found');
  }
};

window.filterGraph = function() {
  const professionFilter = document.getElementById('professionFilter').value;
  const nationalityFilter = document.getElementById('nationalityFilter').value;
  
  // Clear previous highlights
  clearHighlights();

  if (!professionFilter && !nationalityFilter) return;

  const matchingNodes = nodes.get().filter(node => {
    const professionMatch = !professionFilter || 
      (node.profession && node.profession.includes(professionFilter));
    const nationalityMatch = !nationalityFilter || 
      (node.nationality && node.nationality.includes(nationalityFilter));
    return professionMatch && nationalityMatch;
  });

  if (matchingNodes.length > 0) {
    // Highlight matching nodes
    matchingNodes.forEach(node => {
      nodes.update({ 
        id: node.id, 
        color: { ...node.color, border: 'red' }, 
        borderWidth: 4 
      });
    });
    
    // Focus on the first matching node
    network.focus(matchingNodes[0].id, { animation: true });
    lastHighlightedNodes = matchingNodes.map(node => node.id);
  } else {
    alert('No nodes match the selected filters');
  }
};

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
        font: { 
          size: Math.min(18 + degree * 1.2, 48),  // 🔥 proporcional al número de edges
          color: '#ffffff',
          strokeWidth: 0,
          strokeColor: 'transparent',
          face: 'EB Garamond, serif',
          align: 'center',
          bold: true,
          vadjust: -10
        },
        color: { border: '#2B7CE9' },
        borderWidth: 2,
        shape: node.image ? 'circularImage' : 'dot',
        labelHighlightBold: false,
        margin: -5
      };
      config._imageUrl = node.image; // Guardamos temporalmente la URL
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
    let lastNonHighlightedNodes = [];

        function clearHighlights() {
      // Batch update nodes
      const nodeUpdates = [];
      if (lastHighlightedNode) {
        nodeUpdates.push({ 
          id: lastHighlightedNode, 
          color: { border: '#2B7CE9' }, 
          borderWidth: 2,
          opacity: 1 // Reset opacity
        });
      }
      
      if (lastHighlightedNodes.length > 0) {
        lastHighlightedNodes.forEach(id => {
          nodeUpdates.push({ 
            id, 
            color: { border: '#2B7CE9' }, 
            borderWidth: 2,
            opacity: 1 // Reset opacity
          });
        });
      }
      
      // Reset opacity for non-highlighted nodes
      if (lastNonHighlightedNodes.length > 0) {
        lastNonHighlightedNodes.forEach(id => {
          nodeUpdates.push({ 
            id, 
            opacity: 1 // Reset to fully opaque
          });
        });
      }
      
      if (nodeUpdates.length > 0) nodes.update(nodeUpdates);
    
      // Batch update edges
      const edgeUpdates = edges.get().map(edge => ({
        id: edge.id,
        color: edge.connection_level === "secondary" ? "#FFD700" : "lightgray",
        width: 2
      }));
      edges.update(edgeUpdates);
    
      lastHighlightedNode = null;
      lastHighlightedNodes = [];
      lastNonHighlightedNodes = [];
    }
    
    const container = document.getElementById('network');
    const network = new vis.Network(container, { nodes, edges }, {
      nodes: { 
        borderWidth: 2,
        shapeProperties: {
          useBorderWithImage: true
        }
      },
      edges: { color: 'lightgray' },
      physics: {
        solver: 'forceAtlas2Based',
        stabilization: {
          enabled: true,
          iterations: 500,  // Increased stabilization
          updateInterval: 25
        },
        forceAtlas2Based: {
          gravitationalConstant: -120,  // Stronger repulsion
          centralGravity: 0.01,
          springLength: 100,  // Shorter ideal distance
          springConstant: 0.08,
          avoidOverlap: 1.5,  // Increased overlap prevention
          damping: 0.5
        }
      },
      layout: {
        improvedLayout: true,
        randomSeed: 1912  // Consistent layout
      }
    });
    network.once("stabilizationIterationsDone", function () {
      setTimeout(() => {
        network.setOptions({ physics: false });
        network.fit({ animation: true, minZoomLevel: 0.5 });

        document.getElementById('loadingMessage').style.display = 'none';
    
        // 🔁 AÑADE esto aquí dentro
        nodes.forEach(node => {
          if (node._imageUrl) {
            nodes.update({ id: node.id, image: node._imageUrl });
          }
        });
    
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

    function highlightNeighborhood(nodeId) {
      const connectedEdges = edges.get({
        filter: edge => edge.from === nodeId || edge.to === nodeId
      });
      
      const connectedNodes = new Set();
      connectedEdges.forEach(edge => {
        connectedNodes.add(edge.from === nodeId ? edge.to : edge.from);
      });

      // Resaltar edges conectados
      connectedEdges.forEach(edge => {
        edges.update({
          id: edge.id,
          color: { color: '#ffa500' },
          width: 3
        });
      });

      const allEdgeIds = edges.getIds();
      const connectedEdgeIds = new Set(connectedEdges.map(e => e.id));
      
      const fadedEdges = allEdgeIds.filter(id => !connectedEdgeIds.has(id)).map(id => ({
        id,
        color: { color: 'rgba(200,200,200,0.3)' },
        width: 1
      }));
      
      edges.update(fadedEdges);

      // Get all node IDs
      const allNodeIds = nodes.getIds();
      
      // Separate connected and non-connected nodes
      const nonConnectedNodes = allNodeIds.filter(id => 
        id !== nodeId && !connectedNodes.has(id)
      );
      
      // Batch updates
      const updates = [
        { id: nodeId, color: { border: 'red' }, borderWidth: 4 }
      ];
      
      // Highlight connected nodes
      Array.from(connectedNodes).forEach(id => {
        updates.push({ id, color: { border: '#ffa500' }, borderWidth: 3 });
      });
      
      // Make non-connected nodes translucent
      const nonConnectedUpdates = nonConnectedNodes.map(id => ({
        id,
        opacity: 0.3, // Make nodes semi-transparent
        color: {
          ...nodes.get(id).color,
          highlight: nodes.get(id).color.highlight || {},
          hover: nodes.get(id).color.hover || {}
        }
      }));
      
      nodes.update(updates);
      nodes.update(nonConnectedUpdates);
      
      edges.update(
        connectedEdges.map(edge => ({
          id: edge.id,
          color: { color: 'red' },
          width: 2
        }))
      );
      
      lastHighlightedNode = nodeId;
      lastHighlightedNodes = Array.from(connectedNodes);
      lastNonHighlightedNodes = nonConnectedNodes; // Store for clearing later
    }
    
    network.on("click", function (params) {
      if (params.nodes.length > 0) {
        const node = nodes.get(params.nodes[0]);

        clearHighlights();
        highlightNeighborhood(node.id);
        lastHighlightedNode = node.id;

        const degree = edgeCount[node.id] || 0;
        let html = `<div class="node-info">`;

        if (node.image) {
          html += `<img src="${node.image}" alt="${node.id}" style="max-width: 150px;"><br>`;
        }

        html += `<h2>${node.id}</h2>`;

        if (node["life dates"] || node["profession"]) {
          if (node["life dates"]) {
            html += `<p style="margin-top:0.3rem;"><strong>Life dates:</strong> ${node["life dates"]}</p>`;
          }
          if (node["profession"]) {
            html += `<p style="margin-top:0.3rem;"><strong>Profession:</strong> ${node["profession"]}</p>`;
          }
        }

        const fieldsToShow = [
          { type: "section", label: "Identity and Personal Data" },
          { type: "field", key: "full name", label: "Full name" },
          { type: "field", key: "also known as", label: "Also known as" },
          { type: "field", key: "other names", label: "Other names" },
          { type: "field", key: "pseudonyms", label: "Pseudonyms" },
          { type: "field", key: "nationality", label: "Nationality" },
          { type: "field", key: "born in", label: "Born in" },
          { type: "field", key: "considered as", label: "Considered as" },
          { type: "field", key: "political views", label: "Political views" },
          { type: "field", key: "portrayed by", label: "Portrayed by" },
          { type: "field", key: "address", label: "Address" },
          { type: "field", key: "curiosities", label: "Curiosities" },
          { type: "field", key: "aristocratic titles", label: "Aristocratic titles" },
        
          { type: "section", label: "Family and Personal Relationships" },
          { type: "field", key: "parents", label: "Parents" },
          { type: "field", key: "siblings", label: "Siblings" },
          { type: "field", key: "married to", label: "Married to" },
          { type: "field", key: "partners/lovers", label: "Partners/lovers" },
          { type: "field", key: "children", label: "Children" },
          { type: "field", key: "friends", label: "Friends" },
          { type: "field", key: "rivals", label: "Rivals" },
          { type: "field", key: "correspondence", label: "Correspondence" },
          { type: "field", key: "meets", label: "Meets" },
        
          { type: "section", label: "Education, Profession and Institutions" },
          { type: "field", key: "studies in", label: "Studies in" },
          { type: "field", key: "works as", label: "Works as" },
          { type: "field", key: "works for", label: "Works for" },
          { type: "field", key: "students", label: "Students" },
          { type: "field", key: "influenced by", label: "Influenced by" },
          { type: "field", key: "follower of", label: "Follower of" },
          { type: "field", key: "masters", label: "Masters" },
          { type: "field", key: "member of", label: "Member of" },
          { type: "field", key: "founder of", label: "Founder of" },
          { type: "field", key: "editor of", label: "Editor of" },
          { type: "field", key: "writes in", label: "Writes in" },
          { type: "field", key: "participates in", label: "Participates in" },
          { type: "field", key: "collaborates with", label: "Collaborates with" },
          { type: "field", key: "mentions", label: "Mentions" },
          { type: "field", key: "mentioned in the French press", label: "Mentioned in the French press" },
          { type: "field", key: "decorations/awards", label: "Decorations/awards" },
          { type: "field", key: "salon", label: "Salon" },

          { type: "section", label: "Artistic Activity, Art Collecting and Patronage" },
          { type: "field", key: "author of", label: "Author of" },
          { type: "field", key: "patrons", label: "Patrons" },
          { type: "field", key: "patronage", label: "Patronage" },
          { type: "field", key: "collection", label: "Collection" },
          { type: "field", key: "collector of", label: "Collector of" },
          { type: "field", key: "sales", label: "Sales" },

          { type: "section", label: "Geographic Presence and Movement" },
          { type: "field", key: "trips", label: "Trips" },
          { type: "field", key: "in Spain", label: "In Spain" },
          { type: "field", key: "in Madrid", label: "In Madrid" },
          { type: "field", key: "visits the Prado Museum", label: "Visits the Prado Museum" },
          { type: "field", key: "in France", label: "In France" },
          { type: "field", key: "in Paris", label: "In Paris" },
          { type: "field", key: "in Italy", label: "In Italy" },
        
          { type: "section", label: "Relationship to Goya and His Work" },
          { type: "field", key: "link to Goya's work", label: "Link to Goya's work" },
          { type: "field", key: "discovers Goya's works", label: "Discovers Goya's works" },
          { type: "field", key: "knows Goya's works", label: "Knows Goya's works" },
          { type: "field", key: "writes about Goya", label: "Writes about Goya" },
          { type: "field", key: "mentions of Goya", label: "Mentions of Goya" },
          { type: "field", key: "commissions Goya with", label: "Commissions Goya with" },
          { type: "field", key: "influence of Goya", label: "Influence of Goya" },
          { type: "field", key: "collector of Goya's works", label: "Collector of Goya's works" },
          { type: "field", key: "disseminates Goya's works", label: "Disseminates Goya's works" },
          { type: "field", key: "shows Goya", label: "Shows Goya" },
          { type: "field", key: "mentions the Prado commentaries", label: "Mentions the Prado commentaries" },
        
          { type: "section", label: "Sources and Documentation" },
          { type: "field", key: "archives", label: "Archives" },
          { type: "field", key: "bibliography", label: "Bibliography" },
          { type: "field", key: "websites", label: "Websites" },
          { type: "field", key: "image source", label: "Image source" },
        ];

      const nodesMapByLabel = {};
      nodes.get().forEach(n => nodesMapByLabel[n.label] = n);

      fieldsToShow.forEach((field, idx) => {
        if (field.type === "section") {
          // 🔧 Buscar los campos que pertenecen solo a esta sección
          const fieldsInThisSection = [];
          for (let i = idx + 1; i < fieldsToShow.length; i++) {
            if (fieldsToShow[i].type === "section") break;
            fieldsInThisSection.push(fieldsToShow[i]);
          }
      
          const hasData = fieldsInThisSection.some(f => node[f.key]);
          if (hasData) {
            html += `<h3 class="section-heading">${field.label}</h3>`;
          }
        } else if (field.type === "field" && node[field.key]) {
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
          { key: "know each other since", label: "Know each other since" },
          { key: "correspondence", label: "Correspondence" },
          { key: "they met", label: "They met" },
          { key: "shared", label: "Shared" },
          { key: "interactions", label: "Interactions" },
          { key: "they shared", label: "They shared" },
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
          { key: "employment/patronage", label: "Employment/patronage" },
          { key: "commissions", label: "Commissions" },
          { key: "patronage", label: "Patronage" },
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
              // Primero detectar [texto](url)
              value = value.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, (match, text, url) => {
                return `<a href="${url}" target="_blank" style="color:#66ccff;">${text.trim()}</a>`;
              });
              // Luego detectar texto [url] (para compatibilidad con lo antiguo)
              value = value.replace(/([^\[\]]+)\s*\[(https?:\/\/[^\]\s]+)\]/g, (match, text, url) => {
                return `${text.trim()} <a href="${url}" target="_blank" style="color:#66ccff;">[source]</a>`;
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
        return; // Add this to exit early
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
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.querySelector('.search-button');

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
