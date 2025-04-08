document.addEventListener('DOMContentLoaded', async function() {
    try {
        const nodeInfo = document.getElementById('nodeInfo');
        
        // 1. Cargar datos
        nodeInfo.innerHTML = '<p>Cargando datos de la red...</p>';
        const response = await fetch('goya_network.json');
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        nodeInfo.innerHTML = `<p>Datos cargados: ${data.nodes.length} nodos, ${data.edges.length} conexiones</p>`;

        // 2. Preparar datos
        const nodes = new vis.DataSet(data.nodes.map(node => ({
            ...node,
            font: { size: 12, strokeWidth: 3, strokeColor: '#ffffff' },
            size: 16,
            shape: 'dot'
        })));
        
        const edges = new vis.DataSet(data.edges);

        // 3. Crear red
        const container = document.getElementById('network');
        const network = new vis.Network(container, { nodes, edges }, {
            nodes: {
                borderWidth: 2,
                color: {
                    border: '#2B7CE9',
                    background: '#97C2FC',
                    highlight: { border: '#2B7CE9', background: '#D2E5FF' }
                }
            },
            edges: {
                width: 1,
                color: { color: '#848484', highlight: '#FF0000' }
            },
            physics: {
                stabilization: { iterations: 1000 }
            }
        });

        // 4. Mostrar cuando esté listo
        network.once('stabilizationIterationsDone', () => {
            network.fit({ animation: { duration: 1000 } });
            nodeInfo.innerHTML = '<p>Haz clic en un nodo para ver detalles</p>';
        });

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('nodeInfo').innerHTML = `
            <p style="color:red;font-weight:bold">Error cargando la red: ${error.message}</p>
            <p>Verifica la consola para más detalles (F12 > Console)</p>
        `;
    }
});
