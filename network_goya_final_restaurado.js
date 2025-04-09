// network.js - Versión mejorada
document.addEventListener('DOMContentLoaded', async function() {
    try {
        const nodeInfo = document.getElementById('nodeInfo');
        
        // 1. Cargar datos
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
            const nodeConfig = {
                ...node,
                font: { size: 14, strokeWidth: 3, strokeColor: '#ffffff' },
                size: Math.min(20 + degree * 2, 60),
                shape: 'dot'
            };
            if (node.image) {
                nodeConfig.shape = 'circularImage';
                nodeConfig.image = node.image;
            }
            return nodeConfig;
        });

            const nodeConfig = {
                ...node,
                font: { size: 14, strokeWidth: 3, strokeColor: '#ffffff' },
                size: 20,
                shape: 'dot'
            };
            
            // Si tiene imagen, usar forma circular con imagen
            if (node.image) {
                nodeConfig.shape = 'circularImage';
                nodeConfig.image = node.image;
                nodeConfig.size = 25;
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
                    <h2>${node.label}</h2>
                    ${node.image ? `<img src="${node.image}" alt="${node.label}" style="max-width:200px; float:left; margin-right:15px; margin-bottom:15px;">` : ''}
                    <p><strong>Tipo:</strong> ${node.group === 'location' ? 'Ubicación' : 'Persona'}</p>
                `;
                
                // Mostrar propiedades adicionales
                
                if (node.period) infoHTML += `<p><strong>Periodo:</strong> ${node.period}</p>`;
                
                infoHTML += `
                    <div style="clear:both;"></div>
                    <h3>Conexiones (${connections.length}):</h3>
                    <ul>
                        ${connections.map(id => `<li>${nodes.get(id).label}</li>`).join('')}
                    </ul>
                `;
                
                nodeInfo.innerHTML = infoHTML;
            }
        });

        network.once('stabilizationIterationsDone', () => {
            network.fit({ animation: { duration: 1000 } });
        });

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('nodeInfo').innerHTML = `
            <p style="color:red;font-weight:bold">Error: ${error.message}</p>
            <p>Por favor recarga la página</p>
        `;
    }
});
