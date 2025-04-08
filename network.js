// Global variables
let network;
let allNodes;
let allEdges;
let currentlySelectedNode = null;

// Initialize the network
async function initNetwork() {
    // Load data from GEXF (converted to JSON)
    const data = await loadData();
    
    // Create nodes and edges datasets
    allNodes = new vis.DataSet(data.nodes);
    allEdges = new vis.DataSet(data.edges);
    
    // Create the network
    const container = document.getElementById('network');
    const networkData = {
        nodes: allNodes,
        edges: allEdges
    };
    
    const options = {
        nodes: {
            shape: 'dot',
            size: 16,
            font: {
                size: 12,
                color: '#000'
            },
            borderWidth: 2,
            shadow: true
        },
        edges: {
            width: 2,
            color: {
                color: '#848484',
                highlight: '#ff0000',
                hover: '#ff0000'
            },
            smooth: {
                type: 'continuous'
            },
            shadow: true
        },
        groups: {
            location: {
                shape: 'diamond',
                size: 20,
                color: {
                    background: '#4CAF50',
                    border: '#3e8e41',
                    highlight: {
                        background: '#5CBF60',
                        border: '#4eaf51'
                    },
                    hover: {
                        background: '#5CBF60',
                        border: '#4eaf51'
                    }
                },
                font: {
                    size: 14,
                    color: '#000',
                    strokeWidth: 3,
                    strokeColor: '#ffffff'
                }
            },
            person: {
                color: {
                    background: '#2196F3',
                    border: '#0b7dda',
                    highlight: {
                        background: '#31a6ff',
                        border: '#1b8dfa'
                    },
                    hover: {
                        background: '#31a6ff',
                        border: '#1b8dfa'
                    }
                }
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
            tooltipDelay: 200,
            hideEdgesOnDrag: true,
            multiselect: false
        }
    };
    
    network = new vis.Network(container, networkData, options);
    
    // Add event listeners
    setupEventListeners();
    
    // Focus on the network after load
    network.fit({
        animation: {
            duration: 1000,
            easingFunction: 'easeInOutQuad'
        }
    });
}

// Load data from JSON (converted from GEXF)
async function loadData() {
    try {
        // Replace with your actual JSON file path
        const response = await fetch('goya_network.json');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return await response.json();
    } catch (error) {
        console.error('Error loading data:', error);
        
        // Fallback data if JSON fails to load
        return {
            nodes: [
                { id: 1, label: "Salamanca", group: "location", title: "Location" },
                { id: 2, label: "Madrazo", group: "person", period: "19th" },
                { id: 3, label: "Carderera", group: "person", period: "19th" },
                // Add more nodes as needed...
            ],
            edges: [
                { from: 1, to: 2 },
                { from: 1, to: 3 },
                // Add more edges as needed...
            ]
        };
    }
}

// Set up all event listeners
function setupEventListeners() {
    // Node click event
    network.on('click', function(params) {
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            showNodeInfo(nodeId);
            currentlySelectedNode = nodeId;
        } else {
            currentlySelectedNode = null;
            document.getElementById('nodeInfo').innerHTML = '<p>Click on a node to see details</p>';
        }
    });
    
    // Search functionality
    document.getElementById('searchButton').addEventListener('click', searchNode);
    document.getElementById('search').addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
            searchNode();
        }
    });
    
    // Reset button
    document.getElementById('resetButton').addEventListener('click', resetView);
    
    // Filter functionality
    document.getElementById('locationFilter').addEventListener('change', applyFilters);
    document.getElementById('timeFilter').addEventListener('change', applyFilters);
}

// Show detailed information about a node
function showNodeInfo(nodeId) {
    const node = allNodes.get(nodeId);
    const connectedNodes = network.getConnectedNodes(nodeId);
    
    let infoHTML = `<h2>${node.label}</h2>`;
    
    // Add image if available
    if (node.image) {
        infoHTML += `<img id="nodeImage" src="${node.image}" alt="${node.label}">`;
    }
    
    infoHTML += `<p><strong>Type:</strong> ${node.group === 'location' ? 'Location' : 'Person'}</p>`;
    
    // Add additional properties
    if (node.period) {
        infoHTML += `<p><strong>Period:</strong> ${node.period}</p>`;
    }
    if (node.description) {
        infoHTML += `<p><strong>Description:</strong> ${node.description}</p>`;
    }
    
    // Add connections
    infoHTML += `<h3>Connections (${connectedNodes.length}):</h3><ul>`;
    connectedNodes.forEach(connectedId => {
        const connectedNode = allNodes.get(connectedId);
        infoHTML += `<li>${connectedNode.label} (${connectedNode.group === 'location' ? 'Location' : 'Person'})</li>`;
    });
    infoHTML += `</ul>`;
    
    document.getElementById('nodeInfo').innerHTML = infoHTML;
    
    // Highlight the selected node and its connections
    network.selectNodes([nodeId]);
    network.focus(nodeId, {
        scale: 1.2,
        animation: {
            duration: 800,
            easingFunction: 'easeInOutQuad'
        }
    });
}

// Search for a node
function searchNode() {
    const searchTerm = document.getElementById('search').value.toLowerCase();
    if (!searchTerm) return;
    
    const foundNodes = allNodes.get({
        filter: node => node.label.toLowerCase().includes(searchTerm)
    });
    
    if (foundNodes.length > 0) {
        // Select the first match
        const nodeId = foundNodes[0].id;
        showNodeInfo(nodeId);
        
        // Center on the node
        network.focus(nodeId, {
            scale: 1.5,
            animation: {
                duration: 1000,
                easingFunction: 'easeInOutQuad'
            }
        });
    } else {
        alert('No matching individuals found');
    }
}

// Apply filters based on selections
function applyFilters() {
    const locationFilter = document.getElementById('locationFilter').value;
    const timeFilter = document.getElementById('timeFilter').value;
    
    // For location filter, we need to find nodes connected to the location
    let locationNodeIds = [];
    if (locationFilter) {
        // Find the location node
        const locationNodes = allNodes.get({
            filter: node => node.label === locationFilter && node.group === 'location'
        });
        
        if (locationNodes.length > 0) {
            const locationId = locationNodes[0].id;
            // Get all nodes connected to this location
            locationNodeIds = network.getConnectedNodes(locationId);
            locationNodeIds.push(locationId); // Include the location itself
        }
    }
    
    allNodes.forEach(node => {
        let hidden = false;
        
        // Apply location filter
        if (locationFilter && !locationNodeIds.includes(node.id)) {
            hidden = true;
        }
        
        // Apply time period filter
        if (timeFilter && node.period !== timeFilter) {
            hidden = true;
        }
        
        // Special case: always show location nodes when filtering by time
        if (timeFilter && node.group === 'location') {
            hidden = false;
        }
        
        allNodes.update({ id: node.id, hidden });
    });
    
    // Reset view after filtering
    network.fit({
        animation: {
            duration: 1000,
            easingFunction: 'easeInOutQuad'
        }
    });
}

// Reset all filters and selections
function resetView() {
    // Reset filters
    document.getElementById('locationFilter').value = '';
    document.getElementById('timeFilter').value = '';
    document.getElementById('search').value = '';
    
    // Show all nodes
    allNodes.forEach(node => {
        allNodes.update({ id: node.id, hidden: false });
    });
    
    // Reset view
    network.fit({
        animation: {
            duration: 1000,
            easingFunction: 'easeInOutQuad'
        }
    });
    
    // Clear selection
    if (currentlySelectedNode) {
        network.unselectAll();
        currentlySelectedNode = null;
    }
    
    document.getElementById('nodeInfo').innerHTML = '<p>Click on a node to see details</p>';
}

// Initialize the network when the page loads
document.addEventListener('DOMContentLoaded', initNetwork);
