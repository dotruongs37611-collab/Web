document.addEventListener('DOMContentLoaded', async function() {
    try {
        // 1. Cargar los datos actualizados
        const response = await fetch('goya_network.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        console.log('Datos cargados:', {
            nodes: data.nodes.length,
            edges: data.edges.length
        });

        // 2. Crear los datasets para vis.js
        const nodes = new vis.DataSet(
            data.nodes.map(node => ({
                ...node,
                font: { size: 14, strokeWidth: 3, strokeColor: '#ffffff' },
                size: node.group === 'location' ? 25 : 18,
                shape: node.group === 'location' ? 'diamond' : 'dot'
            }))
        );
        
        const edges = new vis.DataSet(data.edges);

        // 3. Configuración de visualización
        const container = document.getElementById('network');
        const networkData = { nodes, edges };
        
        const options = {
            nodes: {
                borderWidth: 2,
                shadow: true,
                color: {
                    border: '#2B7CE9',
                    background: '#97C2FC',
                    highlight: {
                        border: '#2B7CE9',
                        background: '#D2E5FF'
                    },
                    hover: {
                        border: '#2B7CE9',
                        background: '#D2E5FF'
                    }
                }
            },
            edges: {
                width: 1.5,
                smooth: {
                    type: 'continuous'
                },
                shadow: true,
                color: {
                    color: '#848484',
                    highlight: '#FF0000',
                    hover: '#FF0000'
                }
            },
            physics: {
                barnesHut: {
                    gravitationalConstant: -2000,
                    centralGravity: 0.3,
                    springLength: 200,
                    springConstant: 0.04,
                    damping: 0.09,
                    avoidOverlap: 0.1
                },
                stabilization: {
                    enabled: true,
                    iterations: 1000
                }
            },
            interaction: {
                hover: true,
                tooltipDelay: 200,
                hideEdgesOnDrag: true
            }
        };

        // 4. Crear la red
        const network = new vis.Network(container, networkData, options);

        // 5. Ajustar la vista para mostrar todos los nodos
        network.once('stabilizationIterationsDone', function() {
            network.fit({
                nodes: nodes.getIds(),
                animation: {
                    duration: 1000,
                    easingFunction: 'easeInOutQuad'
                }
            });
        });

        // 6. Mostrar información al hacer clic en nodos
        network.on('click', function(params) {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                const node = nodes.get(nodeId);
                const connectedNodes = network.getConnectedNodes(nodeId);
                
                let infoHTML = `<h2>${node.label}</h2>`;
                infoHTML += `<p><strong>Tipo:</strong> ${node.group === 'location' ? 'Ubicación' : 'Persona'}</p>`;
                
                if (node.title) {
                    infoHTML += `<p><strong>Descripción:</strong> ${node.title}</p>`;
                }
                
                infoHTML += `<h3>Conexiones (${connectedNodes.length}):</h3><ul>`;
                connectedNodes.forEach(connectedId => {
                    const connectedNode = nodes.get(connectedId);
                    infoHTML += `<li>${connectedNode.label}</li>`;
                });
                infoHTML += `</ul>`;
                
                document.getElementById('nodeInfo').innerHTML = infoHTML;
            }
        });

    } catch (error) {
        console
