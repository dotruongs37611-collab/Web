document.addEventListener('DOMContentLoaded', async function() {
    try {
        // 1. Cargar datos
        const response = await fetch('goya_network.json');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        // 2. Crear datasets
        const nodes = new vis.DataSet(data.nodes.map(node => ({
            ...node,
            font: { size: 12 },
            size: node.group === 'location' ? 20 : 14
        })));
        
        const edges = new vis.DataSet(data.edges);

        // 3. Configuración básica
        const container = document.getElementById('network');
        const options = {
            nodes: {
                shape: 'dot',
                borderWidth: 2
            },
            edges: {
                width: 1,
                smooth: { type: 'continuous' }
            },
            physics: {
                stabilization: { iterations: 1000 }
            }
        };

        // 4. Crear red
        const network = new vis.Network(container, { nodes, edges }, options);

        // 5. Ajustar vista
        network.once('stabilizationIterationsDone', () => {
            network.fit({ animation: { duration: 1000 } });
        });

        // 6. Manejar clics
        network.on('click', params => {
            if (params.nodes.length) {
                const node = nodes.get(params.nodes[0]);
                document.getElementById('nodeInfo').innerHTML = `
                    <h2>${node.label}</h2>
                    <p>Grupo: ${node.group}</p>
                `;
            }
        });

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('nodeInfo').innerHTML = `
            <p style="color:red">Error cargando la red: ${error.message}</p>
        `;
    }
});
