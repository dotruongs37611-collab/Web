// network.js - Versión mejorada
document.addEventListener('DOMContentLoaded', async function() {
    try {
        const nodeInfo = document.getElementById('nodeInfo');
        
        // 1. Cargar datos
        const response = await fetch('goya_network.json');
        if (!response.ok) throw new Error('Error cargando datos');
        const data = await response.json();
        
        
        // Calcular tamaño proporcional por número de conexiones
        const edgeCount = {};
        data.edges.forEach(edge => {
            edgeCount[edge.from] = (edgeCount[edge.from] || 0) + 1;
            edgeCount[edge.to] = (edgeCount[edge.to] || 0) + 1;
        });

        data.nodes.forEach(node => {
            const degree = edgeCount[node.id] || 1;
            node.size = Math.min(10 + degree * 2, 60); // tamaño escalado
        });

        
                });
    
// 2. Configurar imágenes si existen
        const nodesWithImages = data.nodes.map(node => {
            const nodeConfig = {
                ...node,
                font: { size: 14, strokeWidth: 3, strokeColor: '#ffffff' },shape: 'dot'
            };
            
            // Si tiene imagen, usar forma circular con imagen
            if (node.image) {
                nodeConfig.shape = 'circularImage';
                nodeConfig.image = node.image;
                
            }
            
            return nodeConfig;
        });

        const nodes = new vis.DataSet(nodesWithImages);
        const edges = new vis.DataSet(data.edges);

        // 3. Crear red
        const container = document.getElementById('network');
        const network = new vis.Network(container, { nodes, edges }, {
            nodes: {
                borderWidth: 2,
                color: {
                    border: '#2B7CE9',
                    background: '#97C2FC',
                    hover: { border: '#2B7CE9', background: '#D2E5FF' },
                    highlight: { border: '#2B7CE9', background: '#D2E5FF' }
                }
            },
            edges: {
                width: 1,
                smooth: { type: 'continuous' }
            },
            physics: {
                stabilization: { iterations: 1000 }
            }
        });

        // 4. Manejar clics en nodos
        
        network.on('click', function(params) {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                const node = nodes.get(nodeId);
                const connections = network.getConnectedNodes(nodeId);
                
                let infoHTML = `
                    <h2>${node.id || node.label}</h2>
                    ${node.image ? `<img src="${node.image}" alt="${node.label}" style="max-width:200px; float:left; margin-right:15px; margin-bottom:15px;">` : ''}${node.image_source ? `<p><em>Image source:</em> ${node.image_source}</p>` : ''}
                `;

                Object.entries(node).forEach(([key, value]) => {
                    if (!['id', 'label', 'image', 'shape', 'font', 'size', 'title'].includes(key)) {
                        const formattedValue = Array.isArray(value) ? value.join(', ') : value;
                        infoHTML += `<p><strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong> ${formattedValue}</p>`;
                    }
                });

                infoHTML += `
                    <div style="clear:both;"></div>
                    <h3>Connections (${connections.length}):</h3>
                    <ul>
                        ${connections.map(id => { const connected = nodes.get(id); return `<li><a href='#' class='connection-link' data-id='${id}'>${connected.id || connected.label}</a></li>`; }).join('')}
                    </ul>
                `;
                
                nodeInfo.innerHTML = infoHTML;

        // Volver a activar los enlaces entre nodos desde el panel de detalles
        document.querySelectorAll('.connection-link').forEach(link => {
            link.addEventListener('click', function(event) {
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
                    ${node.image ? `<img src="${node.image}" alt="${node.label}" style="max-width:200px; float:left; margin-right:15px; margin-bottom:15px;">` : ''}${node.image_source ? `<p><em>Image source:</em> ${node.image_source}</p>` : ''}
                `;

                Object.entries(node).forEach(([key, value]) => {
                    if (!['id', 'label', 'image', 'shape', 'font', 'size', 'title'].includes(key)) {
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
                            return `<li><a href='#' class='connection-link' data-id='${id}'>${connected.id || connected.label}</a></li>`;
                        }).join('')}
                    </ul>
                `;

                nodeInfo.innerHTML = infoHTML;

                // Reactivar enlaces nuevos
                document.querySelectorAll('.connection-link').forEach(link => {
                    link.addEventListener('click', arguments.callee);
                });
            });
        });

            }
        });

        network.on('selectEdge', function(params) {
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
    

        network.once('stabilizationIterationsDone', () => {
            network.fit({ animation: { duration: 1500, easingFunction: 'easeInOutQuad' } });
        });

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('nodeInfo').innerHTML = `
            <p style="color:red;font-weight:bold">Error: ${error.message}</p>
            <p>Por favor recarga la página</p>
        `;
    }
});
