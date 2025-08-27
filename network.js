let nodes, edges; // 👈 Hacemos estas variables globales

function autoLinkNames(text, nodesMap) {
  if (!text || typeof text !== "string") return text;

  // Sustituye saltos de línea invisibles por espacio
  text = text.replace(/\r?\n|\r/g, " ");

  // Divide el texto en partes: enlaces HTML intactos y el resto
  const splitParts = text.split(/(<a [^>]+>.*?<\/a>)/g);

  const processed = splitParts.map(part => {
    if (part.startsWith('<a ')) return part; // ya es un enlace, no tocar

    Object.keys(nodesMap).forEach(name => {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?<![\\w>])(${escapedName})(?![\\w<])`, "g");
      part = part.replace(
        regex,
        `<a href="#" style="color:#66ccff" onclick="focusNode('${nodesMap[name].id}')">$1</a>`
      );
    });

    return part;
  });

  return processed.join('');
}

function processMarkdownLinks(text) {
  if (!text || typeof text !== "string") return text;
  
  // Preserve italics
  text = text.replace(/<i>/g, '%%%ITALIC_OPEN%%%').replace(/<\/i>/g, '%%%ITALIC_CLOSE%%%');
  
  // Format 1: [text](url)
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, 
    '<a href="$2" target="_blank" style="color:#66ccff;">$1</a>');
  
  // Format 2: (text)[url]
  text = text.replace(/\(([^)]+)\)\[(https?:\/\/[^\]]+)\]/g, 
    '(<a href="$2" target="_blank" style="color:#66ccff;">$1</a>)');
    
  // Format 3: text [url] (fallback)
  text = text.replace(/(\b[^\s\[\]]+\b)\s*\[(https?:\/\/[^\]]+)\]/g, 
    '<a href="$2" target="_blank" style="color:#66ccff;">$1</a>');
  
  // Restore italics
  text = text.replace(/%%%ITALIC_OPEN%%%/g, '<i>').replace(/%%%ITALIC_CLOSE%%%/g, '</i>');
  
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
  // Add this right after: document.addEventListener('DOMContentLoaded', async function () {
  try {
        // ADD THESE LINES:
        const preloadImages = (nodes) => {
            const promises = nodes
                .filter(node => node.image)
                .map(node => {
                    return new Promise((resolve) => {
                        const img = new Image();
                        img.src = node.image;
                        img.onload = resolve;
                        img.onerror = resolve;
                    });
                });
            return Promise.all(promises);
        };
    
        // Load the network data
        const response = await fetch('goya_network.json');
        if (!response.ok) throw new Error('Error cargando datos');
        const data = await response.json();
        
        // ✅ SIMPLIFIED DUPLICATE REMOVAL - ONLY REMOVE EXACT DUPLICATES ✅
        const uniqueEdges = [];
        const seenEdgeKeys = new Set();

        data.edges.forEach(edge => {
          // Create a simple unique key based only on node pairs
          const fromToKey = edge.from < edge.to ? `${edge.from}_${edge.to}` : `${edge.to}_${edge.from}`;
          
          if (!seenEdgeKeys.has(fromToKey)) {
            seenEdgeKeys.add(fromToKey);
            uniqueEdges.push(edge);
          } else {
            console.log('Removed duplicate connection:', fromToKey);
          }
        });

        // Replace the edges array with the cleaned version
        data.edges = uniqueEdges;
        // ✅✅✅ END OF SIMPLIFIED DUPLICATE REMOVAL ✅✅✅

        // Start image preloading
        const imagePreload = preloadImages(data.nodes);

        // Existing setup code
        const nodeInfo = document.getElementById('nodeInfo');
        nodeInfo.style.maxHeight = '810px';
        nodeInfo.style.overflowY = 'auto';

        const edgeCount = {};
        const countedPairs = new Set(); // Para evitar contar duplicados

        data.edges.forEach(edge => {
          const pairKey = edge.from < edge.to ? `${edge.from}_${edge.to}` : `${edge.to}_${edge.from}`;
          
          // Solo contar si este par único no ha sido contado antes
          if (!countedPairs.has(pairKey)) {
            edgeCount[edge.from] = (edgeCount[edge.from] || 0) + 1;
            edgeCount[edge.to] = (edgeCount[edge.to] || 0) + 1;
            countedPairs.add(pairKey);
          }
        });

        const nodesMap = {};
        const labelToId = {};
        // Ajustes de nodos
        nodes = new vis.DataSet(data.nodes.map(node => {
          labelToId[node.label] = node.id;
          const degree = edgeCount[node.id] || 1;
          const config = {
            ...node,
            size: Math.min(20 + degree * 0.7, 50),
            mass: 1 + degree * 0.15,
            font: {
              size: Math.min(11 + degree * 0.6, 24),
              color: '#ffffff',
              strokeWidth: 3,
              strokeColor: '#111111', 
              face: 'EB Garamond, serif',
              align: 'center',
              bold: true,
              vadjust: -10
            },
            color: { border: '#2B7CE9' },
            borderWidth: 2,
            shape: node.image ? 'circularImage' : 'dot',
            labelHighlightBold: false,
            margin: -10
          };
          config._imageUrl = node.image;
          nodesMap[node.id] = config;
          return config;
        }));

    // === Mapa de vecinos (para detectar micro-familias) ===
    const neighbors = {};
    data.nodes.forEach(n => { neighbors[n.id] = new Set(); });
    data.edges.forEach(e => {
      neighbors[e.from].add(e.to);
      neighbors[e.to].add(e.from);
    });

    // Edges más transparentes (general)
    const edges = new vis.DataSet(data.edges.map(edge => {
      const level = edge.connection_level || "direct";

      // Muestra etiqueta solo si es “direct” o “secondary”.
      // Si termina en “?” (p. ej. “direct?”) NO la pintamos y la ponemos como tooltip.
      const label =
        edge.label === 'direct' || edge.label === 'secondary'
          ? edge.label
          : undefined;

      const title =
        edge.label && /\?$/.test(edge.label)
          ? edge.label  // aparecerá al pasar el ratón
          : edge.title;
      
      // ===== Relaciones estrechas (soporta "relatives: mother-son" y "friends; master-student") =====

      // 1) Recoger y normalizar etiquetas de relación que puedan venir en varios campos
      const rawTags = [];

      // a) Campo "relatives" (p. ej., "mother-son", "brothers", "grandmother-granddaughter")
      if (edge["relatives"]) rawTags.push(String(edge["relatives"]));

      // b) Campo "relationship type" (puede venir con varios: "friends; master-student")
      if (edge["relationship type"]) rawTags.push(String(edge["relationship type"]));

      // c) Claves booleanas/listas que ya usas
      [
        "children","parents","siblings","married to","married in","partners/lovers",
        "masters","students","friends"
      ].forEach(k => {
        if (edge[k]) rawTags.push(k);
      });

      // Normalizar: minúsculas, separar por ; , / y espacios, quitar guiones largos, recortar
      const tags = rawTags
        .join(";")
        .toLowerCase()
        .replace(/–|—/g, "-")
        .split(/[;,/]+/)
        .map(s => s.trim())
        .filter(Boolean);

      // 2) Detectar categorías
      const familyKeywords = [
        "family","relative","relatives","mother","father","son","daughter","child",
        "sister","brother","siblings","husband","wife","spouse","married","marriage",
        "grandmother","grandfather","granddaughter","grandson","cousin","aunt","uncle",
        "partners","partners/lovers","lovers","parent","children"
      ];

      const mentorshipKeywords = [
        "master-student","student-master","master","student","teacher","pupil","mentor","apprentice",
        "masters","students"
      ];

      const friendKeywords = ["friend","friends","friendship"];

      // helpers de búsqueda
      const hasAny = (kwArr) => tags.some(t => kwArr.some(k => t.includes(k)));

      const isFamily     = hasAny(familyKeywords);
      const isMentorship = hasAny(mentorshipKeywords);
      const isFriends    = hasAny(friendKeywords);

      // 3) Asignar longitudes (si hay varias relaciones, usar la MÁS corta)
      const lengths = [];
      if (isFamily)     lengths.push(65);  // familia: muy juntos
      if (isMentorship) lengths.push(85);  // maestro/alumno
      if (isFriends)    lengths.push(95);  // amigos

      let springLength = lengths.length ? Math.min(...lengths) : undefined;


        return {
          ...edge,
          label,
          length: springLength,
          title,
          color: { color: level === "secondary" ? "rgba(255,215,0,0.4)" : "rgba(200,200,200,0.25)" },
          width: 1.5,
          // ADD THESE TWO LINES FOR MINI-FAMILIES:
          physics: true, // Ensure physics is enabled for these edges
          hidden: false  // Make sure edges are visible
        };
      }));

    // ✅✅✅ ADD DETAILED DIAGNostic CODE ✅✅✅
    // Check for duplicate connections to specific nodes
    const goyaConnections = edges.get().filter(edge => 
      edge.from === 'Francisco de Goya' || edge.to === 'Francisco de Goya'
    );

    console.log('=== DIAGNÓSTICO DETALLADO DE CONEXIONES DE GOYA ===');
    console.log('Total Goya connections:', goyaConnections.length);

    // List ALL Goya connections with details
    goyaConnections.forEach((edge, index) => {
      console.log(`${index + 1}. ${edge.from} -> ${edge.to} | Type: ${edge.connection_level || 'N/A'} | Relationship: ${edge['relationship type'] || 'N/A'} | ID: ${edge.id}`);
    });

    // Check for exact duplicates by ID
    const connectionIds = new Set();
    const duplicateIds = new Set();

    goyaConnections.forEach(edge => {
      if (connectionIds.has(edge.id)) {
        duplicateIds.add(edge.id);
        console.log('❌ DUPLICATE ID FOUND:', edge.id, edge);
      }
      connectionIds.add(edge.id);
    });

    console.log('Unique connection IDs:', connectionIds.size);
    console.log('Duplicate IDs found:', duplicateIds.size);

    // Check for semantic duplicates (same from-to pair)
    const connectionPairs = new Set();
    const duplicatePairs = new Set();

    goyaConnections.forEach(edge => {
      const pairKey = edge.from < edge.to ? `${edge.from}_${edge.to}` : `${edge.to}_${edge.from}`;
      if (connectionPairs.has(pairKey)) {
        duplicatePairs.add(pairKey);
        console.log('❌ DUPLICATE PAIR FOUND:', pairKey, edge);
      }
      connectionPairs.add(pairKey);
    });

    console.log('Unique connection pairs:', connectionPairs.size);
    console.log('Duplicate pairs found:', duplicatePairs.size);
    // ✅✅✅ END OF DETAILED DIAGNOSTIC CODE ✅✅✅

    // === Soft springs para agrupar micro-familias ===

    // 1) Contar vecinos comunes por par (|A ∩ B|)
    const pairCounts = new Map();
    Object.keys(neighbors).forEach(u => {
      const arr = Array.from(neighbors[u]);
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const a = arr[i], b = arr[j];
          const key = a < b ? `${a}__${b}` : `${b}__${a}`;
          pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
        }
      }
    });

    // 2) Evitar duplicar aristas reales
    const existing = new Set(
      data.edges.map(e => (e.from < e.to ? `${e.from}__${e.to}` : `${e.to}__${e.from}`))
    );

    // 3) Crear aristas invisibles para pares con ≥ 2 vecinos comunes
    const perNodeCap = {};            // límite de refuerzos por nodo para no “encerrar” hubs
    const cap = 3;
    const softEdges = [];

    pairCounts.forEach((count, key) => {
      if (count >= 2 && !existing.has(key)) {
        const [a, b] = key.split("__");
        perNodeCap[a] = (perNodeCap[a] || 0);
        perNodeCap[b] = (perNodeCap[b] || 0);
        if (perNodeCap[a] >= cap || perNodeCap[b] >= cap) return;

        softEdges.push({
          id: `sim_${a}_${b}`,
          from: a, to: b,
          physics: true,
          smooth: false,
          // más comunes ⇒ muelle un poco más corto (pero con mínimo para no amontonar)
          length: Math.max(90, 160 - Math.min(count, 4) * 20),
          color: { color: 'rgba(0,0,0,0.01)' }, // prácticamente invisible
          width: 0.1,
          selectionWidth: 0,
          hoverWidth: 0
        });
        perNodeCap[a]++; perNodeCap[b]++;
      }
    });

    // ✅✅✅ CORRECT PLACEMENT - ADD THIS RIGHT HERE ✅✅✅
    // ADD STRONGER SPRINGS FOR CLOSE RELATIONSHIPS
    // MODIFICA los "strong relationship edges" para que sean visibles y efectivos:
    const strongRelationshipEdges = [];
    const existingEdgeIds = new Set(edges.get().map(edge => edge.id));

    edges.get().forEach(edge => {
      // Check if this is a close relationship (family, mentorship, friends)
      const isCloseRelationship = edge.length && edge.length <= 95;
      
      if (isCloseRelationship) {
        const strongEdgeId = `strong_${edge.from}_${edge.to}`;
        
        if (!existingEdgeIds.has(strongEdgeId) && edge.id !== strongEdgeId) {
          strongRelationshipEdges.push({
            id: strongEdgeId,
            from: edge.from,
            to: edge.to,
            physics: true,
            length: edge.length * 0.6, // Distancia aún más corta
            color: { color: 'rgba(0,150,255,0.3)' }, // Azul visible para debugging
            width: 2, // Más grueso para ver el efecto
            hidden: false // 🔥 HACER VISIBLE para verificar que funciona
          });
          existingEdgeIds.add(strongEdgeId);
        }
      }
    });

    if (strongRelationshipEdges.length) {
      edges.add(strongRelationshipEdges);
      console.log(`Added ${strongRelationshipEdges.length} visible strong relationship edges`);
    }
    // ✅✅✅ END OF CORRECT PLACEMENT ✅✅✅

    // 4) Añadirlos a la red (usa TU objeto edges ya creado)
    if (softEdges.length) edges.add(softEdges);

    // === PARES CERCANOS: no separarlos en el anti-choques ===
      const closePairs = new Set();
      edges.get().forEach(e => {
        // e.length viene de: familia / master-student / friends o de soft springs
        const L = typeof e.length === 'number' ? e.length : null;
        if (L && L <= 95) { // umbral de “muy cercanos”
          const key = e.from < e.to ? `${e.from}__${e.to}` : `${e.to}__${e.from}`;
          closePairs.add(key);
        }
      });

    const lastModified = response.headers.get("Last-Modified");

    const formattedUpdate = lastModified
      ? new Date(lastModified).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'unknown';

    document.getElementById("networkStats").innerHTML = `Nodes: ${data.nodes.length} | Connections: ${data.edges.length}<br><span style="font-size: 0.8rem; color: #999;">Last update: ${formattedUpdate}</span>`;


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
        color: { color: edge.connection_level === "secondary" ? "rgba(255,215,0,0.25)" : "rgba(200,200,200,0.15)" },
        width: 1.5
      }));

      edges.update(edgeUpdates);
    
      lastHighlightedNode = null;
      lastHighlightedNodes = [];
      lastNonHighlightedNodes = [];
    }
    
    const container = document.getElementById('network');
    if (!container) {
      console.error("❌ No se encontró el contenedor #network.");
      return;
}
    // CREA LA RED con física inicialmente desactivada para evitar "bailes"
    const network = new vis.Network(container, { nodes, edges }, {
      nodes: {
        borderWidth: 2,
        shapeProperties: {
          useBorderWithImage: true
        }
      },
      edges: {
        color: 'rgba(200,200,200,0.2)',
        width: 1
      },
      physics: {
        enabled: false // física desactivada al principio
      },
      layout: {
        improvedLayout: true,
        randomSeed: 1912
      }
    });

    // CUANDO se estabiliza, activamos física suave para mini-movimientos
    network.once("stabilizationIterationsDone", function () {
      network.setOptions({
        physics: {
          enabled: true,
          solver: 'forceAtlas2Based',
          forceAtlas2Based: {
            gravitationalConstant: -80,   // Más separación al activarse
            centralGravity: 0.002,        // Muy suave gravedad central
            springLength: 150,            // Resortes más largos
            springConstant: 0.005,
            damping: 0.9,
            avoidOverlap: 0.5
          }
        }
      });

      document.getElementById('loadingMessage').style.display = 'none';
    });


    function loadFullImages() {
      const imageUpdates = data.nodes
        .filter(node => node.image)
        .map(node => ({ id: node.id, image: node.image }));
      
      if (imageUpdates.length > 0) {
        nodes.update(imageUpdates);
      }
    }
    
  // MODIFICA el código de física para mantenerla activa para las mini-familias:
  network.once("stabilizationIterationsDone", function () {
  // KEEP PHYSICS ENABLED WITH MODERATE FORCES FOR ONGOING GROUPING
  network.setOptions({
    physics: {
      enabled: true, // 🔥 MANTENER FÍSICA ACTIVADA PARA AGRUPAMIENTO CONTINUO
      solver: 'forceAtlas2Based',
      forceAtlas2Based: {
        gravitationalConstant: -15,    // Moderately strong repulsion
        centralGravity: 0.03,          // Moderate central gravity
        springLength: 120,             // Balanced spring length
        springConstant: 0.1,           // Strong springs to maintain groupings
        damping: 0.7,                  // Good damping balance
        avoidOverlap: 0.8              // Strong overlap prevention
      }
    }
  });

    document.getElementById('loadingMessage').style.display = 'none';
    
    try {
      console.log('=== VERIFICACIÓN FINAL DE CONEXIONES ===');
      const finalGoyaConnections = edges.get().filter(edge => 
        edge.from === 'Francisco de Goya' || edge.to === 'Francisco de Goya'
      );
      console.log('Conexiones finales de Goya:', finalGoyaConnections.length);

      // Mostrar todas las conexiones únicas
      const uniqueConnections = new Set();
      finalGoyaConnections.forEach(edge => {
        const otherNode = edge.from === 'Francisco de Goya' ? edge.to : edge.from;
        uniqueConnections.add(otherNode);
      });

      console.log('Nodos únicos conectados a Goya:', uniqueConnections.size);
      console.log('Nodos conectados:', Array.from(uniqueConnections).sort());
    } catch (err) {
      console.error("Error verificando conexiones de Goya:", err);
    }

    function highlightNeighborhood(nodeId) {
      const connectedEdges = edges.get({
        filter: edge => edge.from === nodeId || edge.to === nodeId
      });
      
      const connectedNodes = new Set();
      connectedEdges.forEach(edge => {
        connectedNodes.add(edge.from === nodeId ? edge.to : edge.from);
      });

      const allEdgeIds = edges.getIds();
      const connectedEdgeIds = new Set(connectedEdges.map(e => e.id));
      
      const fadedEdges = allEdgeIds.filter(id => !connectedEdgeIds.has(id)).map(id => ({
        id,
        color: { color: 'rgba(200,200,200,0.3)' },
        width: 1
      }));

      const allNodeIds = nodes.getIds();
      const nonConnected = allNodeIds.filter(id => id !== nodeId && !connectedNodes.has(id));
      nodes.update(nonConnected.map(id => ({ id, opacity: 0.3 })));

      // Atenuar edges no conectados
      const edgeIds = edges.getIds();
      edges.update(edgeIds.map(id => {
        const isConnected = connectedEdgeIds.has(id);
        return {
          id,
          color: { color: isConnected ? 'red' : 'rgba(200,200,200,0.05)' },
          width: isConnected ? 3 : 0.5
        };
      }));

      // Batch updates
      const updates = [
        { id: nodeId, color: { border: 'red' }, borderWidth: 4 }
      ];
      
      // Highlight connected nodes
      Array.from(connectedNodes).forEach(id => {
        updates.push({ id, color: { border: '#ffa500' }, borderWidth: 3 });
      });
    
      const nonConnectedUpdates = nonConnected.map(id => ({
        id,
        opacity: 0.3
      }));
      
      nodes.update(updates);
      nodes.update(nonConnectedUpdates);
      
      lastHighlightedNode = nodeId;
      lastHighlightedNodes = Array.from(connectedNodes);
      lastNonHighlightedNodes = nonConnected;
    }
    
    network.on("click", function (params) {
      if (params.nodes.length > 0) {
        const node = nodes.get(params.nodes[0]);
        updateURL(node.id);  // This line should be here

        clearHighlights();
        highlightNeighborhood(node.id);
        lastHighlightedNode = node.id;

        const degree = edgeCount[node.id] || 0;
        let html = `<div class="node-info">`;

        if (node.image) {
          html += `<img src="${node.image}" alt="${node.id}" style="max-width: 150px;"><br>`;
        }

        html += `<h2>${node.id}</h2>`;

        const fieldsToShow = [
          { type: "section", label: "Identity and Personal Data" },
          { type: "field", key: "life dates", label: "Life dates" },
          { type: "field", key: "full name", label: "Full name" },
          { type: "field", key: "also known as", label: "Also known as" },
          { type: "field", key: "other names", label: "Other names" },
          { type: "field", key: "pseudonyms", label: "Pseudonyms" },
          { type: "field", key: "profession", label: "Profession" },
          { type: "field", key: "nationality", label: "Nationality" },
          { type: "field", key: "born in", label: "Born in" },
          { type: "field", key: "dies in", label: "Dies in" },
          { type: "field", key: "considered as", label: "Considered as" },
          { type: "field", key: "political views", label: "Political views" },
          { type: "field", key: "military activity", label: "Military activity" },
          { type: "field", key: "aristocratic titles", label: "Aristocratic titles" },
          { type: "field", key: "curiosities", label: "Curiosities" },
        
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
          { type: "field", key: "influenced by", label: "Influenced by" },
          { type: "field", key: "follower of", label: "Follower of" },
          { type: "field", key: "masters", label: "Masters" },
          { type: "field", key: "students", label: "Students" },
          { type: "field", key: "member of", label: "Member of" },
          { type: "field", key: "founder of", label: "Founder of" },
          { type: "field", key: "editor of", label: "Editor of" },
          { type: "field", key: "writes in", label: "Writes in" },
          { type: "field", key: "participates in", label: "Participates in" },
          { type: "field", key: "collaborates with", label: "Collaborates with" },
          { type: "field", key: "registered in", label: "Registered in" },
          { type: "field", key: "mentions", label: "Mentions" },
          { type: "field", key: "mentioned in the French press", label: "Mentioned in the French press" },
          { type: "field", key: "decorations/awards", label: "Decorations/awards" },
          { type: "field", key: "tertulia", label: "Tertulia" },

          { type: "section", label: "Artistic Activity, Art Collecting and Patronage" },
          { type: "field", key: "literary salon or tertulia", label: "Literary salon or tertulia" },
          { type: "field", key: "author of", label: "Author of" },
          { type: "field", key: "patrons", label: "Patrons" },
          { type: "field", key: "patronage", label: "Patronage" },
          { type: "field", key: "portrayed by", label: "Portrayed by" },
          { type: "field", key: "collection", label: "Collection" },
          { type: "field", key: "art collection", label: "Art collection" },
          { type: "field", key: "collector of", label: "Collector of" },
          { type: "field", key: "exhibitions", label: "Exhibitions" },
          { type: "field", key: "sales", label: "Sales" },

          { type: "section", label: "Geographic Presence and Movement" },
          { type: "field", key: "lives in", label: "Lives in" },
          { type: "field", key: "address", label: "Address" },
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
          { type: "field", key: "copies after Goya", label: "Copies after Goya" },
          { type: "field", key: "writes about Goya", label: "Writes about Goya" },
          { type: "field", key: "mentions of Goya", label: "Mentions of Goya" },
          { type: "field", key: "commissions Goya with", label: "Commissions Goya with" },
          { type: "field", key: "influence of Goya", label: "Influence of Goya" },
          { type: "field", key: "collector of Goya's works", label: "Collector of Goya's works" },
          { type: "field", key: "disseminates Goya's works", label: "Disseminates Goya's works" },
          { type: "field", key: "shows Goya", label: "Shows Goya" },
          { type: "field", key: "mentions the Prado commentaries", label: "Mentions the Prado commentaries" },
          { type: "field", key: "interest in Spanish art", label: "Interest in Spanish art" },
          { type: "field", key: "copies after Spanish artworks", label: "Copies after Spanish artworks" },
        
          { type: "section", label: "Sources and Documentation" },
          { type: "field", key: "archives", label: "Archives" },
          { type: "field", key: "bibliography", label: "Bibliography" },
          { type: "field", key: "newspaper archive", label: "Newspaper archive" },
          { type: "field", key: "websites", label: "Websites" },
          { type: "field", key: "podcasts", label: "Podcasts" },
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
              if (typeof item === 'string' && (item.includes('<img') || item.includes('<div'))) {
                return `<li>${item}</li>`; // Ya es HTML, no volver a procesar
              } else {
                return `<li>${autoLinkNames(processMarkdownLinks(item), nodesMap)}</li>`;
              }
            });
            htmlText = `${processedItems.join("")}`; // sin <ul> ni <li>

          } else {
            if (typeof value === 'string' && (value.includes('<img') || value.includes('<div'))) {
              htmlText = value; // Ya es HTML
            } else {
              htmlText = autoLinkNames(processMarkdownLinks(value), nodesMap);
            }
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
        addShareButton(node.label);
        
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
          { key: "connection_level", label: "Type of connection" },
          { key: "relationship type", label: "Type of relationship" },
          { key: "know each other since", label: "Know each other since" },
          { key: "correspondence", label: "Correspondence" },
          { key: "they met", label: "They met" },
          { key: "shared", label: "Shared" },
          { key: "they shared", label: "They shared" },
          { key: "interactions", label: "Interactions" },
          { key: "feuds", label: "Feuds" },
          { key: "common friends", label: "Common friends" },
          { key: "mentions", label: "Mentions" },
          { key: "collaborations", label: "Collaborations" },
          { key: "curiosities", label: "Curiosities" },
          { key: "children", label: "Children" },
          { key: "married in", label: "Married in" },
          { key: "link to Goya's work", label: "Link to Goya's work" },
          { key: "link to Goya", label: "Link to Goya" },
          { key: "copies after Goya", label: "Copies after Goya" },
          { key: "copies", label: "Copies" },
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
          { key: "interest in Spanish art", label: "Interest in Spanish art" },
          { key: "artworks bought/sold/given", label: "Artworks bought/sold/given" },
          { key: "comparisons", label: "Comparisons" },
          { key: "criticism", label: "Criticism" },
          { key: "rivalry", label: "Rivalry" },
          { key: "employment/patronage", label: "Employment/patronage" },
          { key: "commissions", label: "Commissions" },
          { key: "influence", label: "Influence" },
          { key: "exchanges", label: "Exchanges" },
          { key: "collection", label: "Collection" },
          { key: "patronage", label: "Patronage" },
          { key: "portraits", label: "Portraits" },
          { key: "exhibitions", label: "Exhibitions" },
          { key: "bibliography", label: "Bibliography" },
          { key: "websites", label: "Websites" },
          { key: "podcasts", label: "Podcasts" },
          { key: "newspaper archive", label: "Newspaper archive" },
          { key: "archives", label: "Archives" }
        ];

        edgeFields.forEach(field => {
          if (edge[field.key]) {
            let value = edge[field.key];
            let htmlText;
        
            // Debugging: Check the raw value
            console.log("Raw value:", value);
        
            if (Array.isArray(value)) {
              // ✅ Si es un array de strings u objetos con imagen
              const processedItems = value.map(item => {
                if (typeof item === "object") {
                  const caption = item.caption
                    ? autoLinkNames(processMarkdownLinks(item.caption), nodesMap)
                    : "";
                  const url = item.url ? item.url : "";

                  return `<li>${caption}${url ? `<img src="${url}" alt="Portrait" style="max-width:100%; margin-left: 0.5rem; vertical-align: middle;">` : ""}</li>`;
                } else {
                  return `<li>${autoLinkNames(processMarkdownLinks(item), nodesMap)}</li>`;
                }
              });

              htmlText = `<ul>${processedItems.join("")}</ul>`;
            
            } else {
              // ✅ Si es string normal
              htmlText = autoLinkNames(processMarkdownLinks(value), nodesMap);
            }

            // Debugging: Check the processed HTML
            console.log("Processed HTML:", htmlText);
        
            html += `<p style="margin-top:0.3rem;"><strong>${field.label}:</strong> ${htmlText}</p>`;
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

    function showShareModal(label = '') {
      const modal = document.getElementById('shareModal');
      const hash = '#' + label.replace(/ /g, '_');
      const shareUrl = `${window.location.origin}${window.location.pathname}${hash}`;
      const text = `Check out ${label} on the Goya Network`;
    
      document.getElementById('shareUrl').value = shareUrl;
    
      document.getElementById('twitterShare').href =
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    
      document.getElementById('linkedinShare').href =
        `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(text)}`;
    
      document.getElementById('facebookShare').href =
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(text)}`;
    
      modal.style.display = 'flex';
    }

    // Crear y añadir botón
    function addShareButton(nodeName) {
      const shareBtn = document.createElement('button');
      shareBtn.innerHTML = '<i class="fas fa-share-alt"></i> Share';
      shareBtn.style.marginTop = '1rem';
      shareBtn.style.padding = '0.5rem 1rem';
      shareBtn.style.background = '#333';
      shareBtn.style.color = 'white';
      shareBtn.style.border = '1px solid #555';
      shareBtn.style.borderRadius = '4px';
      const label = nodes.get(nodeName)?.label || nodeName;
      shareBtn.onclick = () => showShareModal(label);

      const nodeInfo = document.getElementById('nodeInfo');
      if (nodeInfo) {
        const existingShareBtn = nodeInfo.querySelector('.share-btn');
        if (existingShareBtn) existingShareBtn.remove();
        shareBtn.className = 'share-btn';
        nodeInfo.appendChild(shareBtn);
      }
    }

    // Update URL when a node is clicked
    function updateURL(nodeId) {
      const node = nodes.get(nodeId);
      const label = node?.label || nodeId;
      const newUrl = window.location.pathname + '#' + label.replace(/ /g, '_');
      window.history.pushState({}, '', newUrl);
    }

    // Handle initial URL hash
    function handleInitialHash() {
      return new Promise((resolve) => {
        const hash = window.location.hash.substring(1);
        if (hash) {
          const decodedHash = decodeURIComponent(hash).replace(/_/g, ' ');
          const idFromLabel = labelToId[decodedHash];
          const node = idFromLabel ? nodes.get(idFromLabel) : null;

          if (node) {

            // Wait for network to stabilize
            setTimeout(() => {
              network.selectNodes([node.id]);
              network.emit("click", { nodes: [node.id] });
              resolve(true);
            }, 1000);
          } else {
            resolve(false);
          }
        } else {
          resolve(false);
        }
      });
    }

      // Add this right after network creation:
      setTimeout(() => {
        // Defer these heavy operations
        handleInitialHash();
        loadFullImages();
      }, 500);
      
      }, 2000);

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
          Object.entries(edge).some(([key, value]) => {
            if (key === "from" || key === "to" || key === "portraits") return false;
            return typeof value === 'string' &&
                  !key.includes('image') &&
                  value.toLowerCase().includes(query);
          })
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

        window.toggleFullScreen = function () {
          const elem = document.documentElement;
          if (!document.fullscreenElement) {
            elem.requestFullscreen().catch(err => {
              alert(`Error trying to enable full-screen mode: ${err.message}`);
            });
          } else {
            document.exitFullscreen();
          }
        }

        // Activar física solo mientras se arrastra un nodo
        network.on("dragStart", () => {
          network.setOptions({ physics: { enabled: true } });
        });
        
        network.on("dragEnd", () => {
          network.setOptions({ physics: { enabled: false } });
        });
          
        } catch (err) {
          console.error("Error cargando o renderizando la red:", err);
        }
      });
