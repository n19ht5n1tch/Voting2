let web3;
let voteFactoryContract;
let selectedContractAddress;

// Connect to Ethereum network and initialize contract
async function connect() {
    try {
        web3 = new Web3(new Web3.providers.WebsocketProvider("wss://polygon-amoy.infura.io/ws/v3/fdb3c8edb2694db4afa9d2a87f3c5ea7"));
        console.log('Connected to Infura');

        // Other initialization code
        await initializeContract();
        fetchDeployedContracts();
    } catch (error) {
        console.error('Connection error:', error);
    }
}

function displayWalletAddress(address) {
    const connectButton = document.getElementById('connectButton');
    const shortaddr = address.substring(0, 6);
    if (address) {
        connectButton.innerHTML = `Connected : ${shortaddr}`;
        connectButton.removeAttribute('onclick');
    } else {
        connectButton.textContent = 'Connect Wallet';
        connectButton.setAttribute('onclick', 'connect()');
    }
}

function handleAccountsChanged(newAccounts) {
    if (newAccounts.length === 0) {
      // User disconnected from MetaMask
      web3 = null;
      accounts = null;
      clearWalletAddress(); // Clear the displayed address
      displayConnectButton(); // Display the connect button
      localStorage.removeItem('walletAddress'); // Remove stored address from local storage
      alert("Wallet disconnected");
    } else {
      accounts = newAccounts;
      const address = accounts[0];
      displayWalletAddress(address); // Display the new connected account
      localStorage.setItem('walletAddress', address); // Update stored address in local storage
      alert("Wallet connected");
      initializeContract();
    }
}

// Initialize contract instance
async function initializeContract() {
    if (!web3) {
        console.error('Web3 is not initialized.');
        return;
    }

    try {
        voteFactoryContract = new web3.eth.Contract(factoryabi, factorycontractAddress);
        console.log('VoteFactory contract initialized:', voteFactoryContract);
    } catch (error) {
        console.error('Error initializing VoteFactory contract:', error);
    }
}

// Fetch deployed contracts and populate dropdown
async function fetchDeployedContracts() {
    try {
        const result = await voteFactoryContract.methods.getVoteContracts().call();
        const contractAddresses = result[0];
        const contractNames = result[1];

        const contractSelect = document.getElementById('contractSelect');
        contractAddresses.forEach((contractAddress, index) => {
            const option = document.createElement('option');
            option.value = contractAddress;
            option.textContent = contractNames[index];
            contractSelect.appendChild(option);
        });

        // Add event listener for contract select change
        contractSelect.addEventListener('change', async () => {
            selectedContractAddress = contractSelect.value;
            await fetchAndDisplayResults(selectedContractAddress);
        });
    } catch (error) {
        console.error('Error fetching deployed contracts:', error);
    }
}


async function fetchAndDisplayResults(contractAddress) {
    try {
        // Fetch remaining time from the contract
        const remainingTime = await getRemainingTime(contractAddress);

        // Update contract duration on the page
        const durationValue = document.getElementById('durationValue');
        const contractDuration = document.getElementById('contractDuration');
        
        if (remainingTime > 0) {
            // Display remaining time in minutes
            const remainingMinutes = Math.ceil(remainingTime / 60);
            durationValue.textContent = `${remainingMinutes} minutes`;
            contractDuration.style.display = 'block'; // Show duration on the page
            document.getElementById('votingStatus').textContent = 'Voting in Progress';
            destroyCharts(); // Remove any existing charts
            return;
        }

        const votingData = await fetchVotingDataFromContract(contractAddress);
        const mostVotedCandidate = getMostVotedCandidate(votingData.candidates);

        if (votingData && votingData.totalVotes > 0 && mostVotedCandidate) {
            durationValue.textContent = ''; // Clear the duration value
            contractDuration.style.display = 'none'; // Hide duration when voting has finished
            document.getElementById('votingStatus').textContent = `Voting has finished and ${mostVotedCandidate.name} has won`;
            destroyCharts();
            createPieChart(votingData);
            createBarGraph(votingData);
        } else {
            durationValue.textContent = '';
            contractDuration.style.display = 'none';
            document.getElementById('votingStatus').textContent = 'No votes or invalid data';
            const pieContainer = document.querySelector('.pie-container');
            const barContainer = document.querySelector('.bar-container');
            if (pieContainer) pieContainer.remove();
            if (barContainer) barContainer.remove();
        }

        console.log('Selected contract:', contractAddress);
    } catch (error) {
        console.error('Error fetching and displaying results:', error);
    }
}

function getMostVotedCandidate(candidates) {
    if (candidates.length === 0) return null;

    let mostVoted = candidates[0];
    for (let i = 1; i < candidates.length; i++) {
        if (candidates[i].voteCount > mostVoted.voteCount) {
            mostVoted = candidates[i];
        }
    }
    return mostVoted;
}


function displayVotingInProgress(remainingTime) {
    const votingStatusDiv = document.getElementById('votingStatus');
    const minutes = Math.floor(remainingTime / 60); // Convert remaining time from seconds to minutes
    votingStatusDiv.textContent = `Voting in Progress - Remaining Time: ${minutes} minutes`;
}


async function fetchVotingDataFromContract(contractAddress) {
    try {
        const voteContract = new web3.eth.Contract(voteBaseContractABI, contractAddress);
        const candidatesCount = await voteContract.methods.candidatesCount().call();
        const candidates = [];

        // Fetch candidate names and vote counts
        for (let i = 1; i <= candidatesCount; i++) {
            const candidate = await voteContract.methods.candidates(i).call();
            candidates.push(candidate);
        }

        // Calculate total votes
        let totalVotes = 0;
        candidates.forEach(candidate => {
            totalVotes += parseInt(candidate.voteCount);
        });

        return { candidates, totalVotes };
    } catch (error) {
        console.error('Error fetching voting data from contract:', error);
        return null;
    }
}


function createPieContainer() {
    const container = document.createElement('div');
    container.classList.add('pie-container');
    document.body.appendChild(container);
}

function createBarContainer() {
    const container = document.createElement('div');
    container.classList.add('bar-container');
    document.body.appendChild(container);
}

function destroyCharts() {
    if (window.myPieChart) {
        window.myPieChart.destroy();
        window.myPieChart = null; // Set chart instance to null after destroying
    }
    if (window.myBarChart) {
        window.myBarChart.destroy();
        window.myBarChart = null; // Set chart instance to null after destroying
    }
}

// Call connect when the page loads
window.addEventListener('load', connect);

// Add event listener for contract select change
contractSelect.addEventListener('change', async () => {
    selectedContractAddress = contractSelect.value;
    await fetchAndDisplayResults(selectedContractAddress);
});



async function getRemainingTime(contractAddress) {
    try {
        const voteContract = new web3.eth.Contract(voteBaseContractABI, contractAddress);
        const remainingTime = await voteContract.methods.getRemainingTime().call(); // Example function to get remaining time
        return parseInt(remainingTime); // Convert remaining time to integer for comparison
    } catch (error) {
        console.error('Error fetching remaining time from contract:', error);
        return 0; // Return 0 if there's an error or remaining time is not available
    }
}








// Create a pie chart using Chart.js
function createPieChart(votingData) {
    const ctx = document.getElementById('pieChart').getContext('2d');
    ctx.canvas.width = 800; // Set the width of the canvas
    ctx.canvas.height = 600; // Set the height of the canvas

    if (window.myPieChart) {
        window.myPieChart.destroy();
    }

    // Generate colors dynamically based on the number of candidates
    const backgroundColors = generateColors(votingData.candidates.length);

    window.myPieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: votingData.candidates.map(candidate => candidate.name),
            datasets: [{
                label: 'Vote Percentage',
                data: votingData.candidates.map(candidate => (candidate.voteCount / votingData.totalVotes) * 100),
                backgroundColor: backgroundColors,
                borderWidth: 1,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#000000', // Dark color
                        font: {
                            weight: 'bold',
                        },
                    },
                },
                datalabels: {
                    color: '#000000', // Dark color
                    font: {
                        weight: 'bold',
                    },
                },
            },
        },
    });
}

function generateColors(numColors) {
    const colors = [];
    for (let i = 0; i < numColors; i++) {
        const hue = (i * (360 / numColors)) % 360;
        const color = `hsl(${hue}, 50%, 50%)`; // Generate colors using HSL color model
        colors.push(color);
    }
    return colors;
}


Chart.defaults.color = '#000000'
Chart.defaults.font.weight = 'bold'
Chart.defaults.font.size = '20'


function createBarGraph(votingData) {
    const ctx = document.getElementById('barGraph').getContext('2d');
    ctx.canvas.width = 800; // Set the width of the canvas
    ctx.canvas.height = 600; // Set the height of the canvas
    if (window.myBarChart) {
        window.myBarChart.destroy();
    }

    // Generate colors dynamically based on the number of candidates
    const backgroundColors = generateColors(votingData.candidates.length);

    window.myBarChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: votingData.candidates.map(candidate => candidate.name),
            datasets: [{
                label: 'Vote Count',
                data: votingData.candidates.map(candidate => candidate.voteCount),
                backgroundColor: backgroundColors,
                borderWidth: 1,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        font: {
                            weight: 'bold', // Set legend label font weight to bold
                            color: '#000000', // Set legend label font color to dark
                        }
                    },
                    title: {
                        display: true,
                        color: '#000000', // Custom legend title color
                        font: {
                            size: 16,
                            style: 'bold', // Custom legend title font style
                        },
                        padding: 10, // Custom padding around the legend title
                    }
                },
                datalabels: {
                    color: '#000000', // Dark color
                    font: {
                        weight: 'bold', // Set data label font weight to bold
                    },
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    stepSize: 1,
                    ticks: {
                        font: {
                            weight: 'bold', // Set y-axis ticks font weight to bold
                            color: '#000000', // Set y-axis ticks font color to dark
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            weight: 'bold', // Set x-axis ticks font weight to bold
                            color: '#000000', // Set x-axis ticks font color to dark
                        }
                    }
                }
            },
        },
    });
}

function generateColors(numColors) {
    const colors = [];
    for (let i = 0; i < numColors; i++) {
        const hue = (i * (360 / numColors)) % 360;
        const color = `hsl(${hue}, 50%, 50%)`; // Generate colors using HSL color model
        colors.push(color);
    }
    return colors;
}








// Call connect when the page loads
window.addEventListener('load', connect);
