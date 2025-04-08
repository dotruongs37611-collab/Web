// Load your GEXF data - you'll need to convert it to JSON first
// For now, I'll create a sample dataset based on your image

// Create nodes array
const nodes = new vis.DataSet([
    // Salamanca group
    { id: 1, label: "Salamanca", group: "location", title: "Location" },
    { id: 2, label: "Madraza", group: "person" },
    { id: 3, label: "Madrata", group: "person" },
    { id: 4, label: "R. Madrata", group: "person" },
    { id: 5, label: "Garetta", group: "person" },
    
    // Yrinte group
    { id: 6, label: "Yrinte", group: "location", title: "Location" },
    { id: 7, label: "Brunet", group: "person" },
    { id: 8, label: "Corfresse", group: "person" },
    // Add more nodes as needed...
    
    // Montgolfier group (largest)
    { id: 20, label: "Montgolfier", group: "location", title: "Location" },
    { id: 21, label: "Burty", group: "person" },
    { id: 22, label: "Mattharpa", group: "person" },
    // Add all Montgolfier members...
    
    // V. López group
    { id: 40, label: "V. López", group: "location", title: "Location" },
    { id: 41, label: "Moratin", group: "person" },
    { id: 42, label: "Martínez", group: "person" },
    // Add all V. López members...
]);

// Create edges array
const edges = new vis.DataSet([
    { from: 1, to: 2 }, // Salamanca to Madraza
    { from: 1, to: 3 },
    { from: 1, to: 4 },
    { from: 1, to: 5 },
    
    { from: 6, to: 7 }, // Yrinte to Brunet
    { from: 6, to: 8 },
    // Add more connections...
    
    { from: 20, to: 21 }, // Montgolfier to Burty
    { from: 20, to: 22 },
    // Add all Montgolfier connections...
    
    { from: 40, to: 41 }, // V. López to Moratin
    { from: 40, to: 42 },
    // Add all V. López connections...
    
    // Add some cross-group connections to show relationships
    { from: 2, to: 7 }, // Madraza to Brunet
    { from: 21, to: 41 }, // Burty to Moratin
]);

// Create the network
const container = document.getElementById("network");
const data = {
    nodes: nodes,
    edges: edges
};
const options = {
    nodes: {
        shape: "dot",
        size: 16,
        font: {
            size: 12,
            color: "#000"
        },
        borderWidth: 2
    },
    edges: {
        width: 2,
        color: { inherit: "from" },
        smooth: {
            type: "continuous"
        }
    },
    groups: {
        location: {
            color: { background: "#4CAF50", border: "#3e8e41" },
            shape: "diamond",
            size: 20
        },
        person: {
            color: { background: "#2196F3", border: "#0b7dda" }
        }
    },
    physics: {
        stabilization: {
            enabled: true,
            iterations: 1000
        },
        barnesHut: {
            gravitationalConstant: -2000,
            centralGravity: 0.3,
            springLength: 200,
            springConstant: 0.04,
            damping: 0.09,
            avoidOverlap: 0.1
        }
    },
    interaction: {
        hover: true,
        tooltipDelay: 200
    }
};

const network = new vis.Network(container, data, options);

// Handle node clicks to show information
network.on("click", function(params) {
    if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const node = nodes.get(nodeId);
        const connectedNodes = network.getConnectedNodes(nodeId);
        
        let infoHTML = `<h2>${node.label}</h2>`;
        infoHTML += `<p>Type: ${node.group}</p>`;
        infoHTML += `<h3>Connections:</h3><ul>`;
        
        connectedNodes.forEach(connectedId => {
            const connectedNode = nodes.get(connectedId);
            infoHTML += `<li>${connectedNode.label}</li>`;
        });
        
        infoHTML += `</ul>`;
        document.getElementById("nodeInfo").innerHTML = infoHTML;
    }
});
