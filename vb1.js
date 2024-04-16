let web3;
let voteFactoryContract;

async function connect() {
    if (window.ethereum) {
        try {
            const storedAddress = localStorage.getItem('walletAddress');
            if (storedAddress) {
                console.log('Using stored wallet address:', storedAddress);
                web3 = new Web3(window.ethereum);
                displayWalletAddress(storedAddress);
                
                await initializeContract();
                fetchDeployedContracts();
                startPing();
                return;
            }

            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            web3 = new Web3(window.ethereum);
            const address = accounts[0];
            console.log('Connected account:', address);
            displayWalletAddress(address);
            localStorage.setItem('walletAddress', address);
            alert("Wallet connected");
            await initializeContract();
            startPing();
        } catch (error) {
            console.log('Connection error:', error);
        }
    } else {
        console.log("No wallet available");
    }
}

function startPing() {
    const intervalId = setInterval(() => {
        web3.eth.getBlockNumber()
            .then(blockNumber => console.log('Connection alive:', blockNumber))
            .catch(error => console.error('Error pinging provider:', error));
    }, 30000);

    window.addEventListener('beforeunload', () => {
        clearInterval(intervalId);
        console.log('Ping interval stopped');
    });
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

// Initialize contract addresses and ABI

// Function to fetch and display deployed contracts
// Function to populate candidates for a contract and handle vote button click
// Function to toggle dropdown visibility
// Function to toggle visibility of candidates under a contract
// Function to toggle visibility of candidates under a contract
// Function to toggle visibility of candidates under a contract

// Function to calculate remaining time in minutes
async function calculateRemainingTime(contractAddress) {
    const voteContract = new web3.eth.Contract(voteBaseContractABI, contractAddress);
    const votingEndTime = await voteContract.methods.votingEndTime().call();
    const currentTime = Math.floor(Date.now() / 1000); // Convert current time to seconds

    if (currentTime < votingEndTime) {
        const remainingTimeSeconds = votingEndTime - currentTime;
        return remainingTimeSeconds;
    } else {
        return 0; // Voting has ended
    }
}

function startLiveDurationUpdate(contractAddress, contractId) {
    setInterval(async () => {
        const remainingTime = await calculateRemainingTime(contractAddress);
        const minutes = Math.floor(remainingTime / 60);
        const seconds = remainingTime % 60;
        const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        document.getElementById(`duration_display_${contractId}`).textContent = formattedTime;
    }, 1000); // Update every second
}

// Function to populate candidates and handle vote button click
async function populateCandidates(contractAddress, contractId) {
    try {
        const voteContract = new web3.eth.Contract(voteBaseContractABI, contractAddress);
        const candidatesCount = await voteContract.methods.candidatesCount().call();

        for (let i = 1; i <= candidatesCount; i++) {
            const candidate = await voteContract.methods.candidates(i).call();
            const candidateName = candidate.name;
            const candidateId = candidate.id;

            // Create a container for each candidate
            const candidateContainer = document.createElement('div');
            candidateContainer.classList.add('candidate-container');

            // Create an element for the candidate name
            const candidateNameElement = document.createElement('span');
            candidateNameElement.textContent = candidateName;
            candidateNameElement.classList.add('candidate-name');
            candidateContainer.appendChild(candidateNameElement);

            // Create a button for voting
            const voteButton = document.createElement('button');
            voteButton.textContent = 'Vote';
            voteButton.classList.add('vote-button');
            voteButton.addEventListener('click', async () => {
                await voteContract.methods.castVote(candidateId).send({ from: web3.currentProvider.selectedAddress });
                alert(`Voted for ${candidateName}`);
            });
            candidateContainer.appendChild(voteButton);

            // Append the candidate container to the candidates list
            document.getElementById(`candidatesList_${contractId}`).appendChild(candidateContainer);
        }
    } catch (error) {
        console.error('Error populating candidates:', error);
    }
}




// Function to fetch and display deployed contracts with candidates and vote button
async function fetchDeployedContracts() {
    try {
        const result = await voteFactoryContract.methods.getVoteContracts().call();
        const contractAddresses = result[0];
        const contractNames = result[1];

        for (let index = 0; index < contractAddresses.length; index++) {
            const contractAddress = contractAddresses[index];
            const contractName = contractNames[index];
            const remainingTime = await calculateRemainingTime(contractAddress);
            
            if (remainingTime > 0) {
                const contractId = `contract_${index}`;

                const contractContainer = document.createElement('div');
                contractContainer.classList.add('contract', 'candidate');

                const contractDetails = document.createElement('div');
                contractDetails.classList.add('contract-details');

                const contractNameElement = document.createElement('div');
                contractNameElement.classList.add('contract-name');

                const contractText = document.createElement('span');
                contractText.classList.add('contract-text');
                contractText.textContent = contractName;
                contractNameElement.appendChild(contractText);

                const durationContainer = document.createElement('div');
                durationContainer.classList.add('duration-container');

                const durationDisplay = document.createElement('div');
                durationDisplay.id = `duration_display_${contractId}`;
                durationDisplay.classList.add('duration-display');
                durationDisplay.textContent = '00:00';
                durationContainer.appendChild(durationDisplay);

                const dropdownDiv = document.createElement('div');
                dropdownDiv.classList.add('dropdown-arrow');
                dropdownDiv.setAttribute('onclick', `toggleCandidates('${contractId}')`);

                contractDetails.appendChild(contractNameElement);
                contractDetails.appendChild(durationContainer);
                contractDetails.appendChild(dropdownDiv);

                contractContainer.appendChild(contractDetails);

                const candidatesList = document.createElement('ul');
                candidatesList.id = `candidatesList_${contractId}`;
                candidatesList.classList.add('candidates-list');
                candidatesList.style.display = 'none';

                contractContainer.appendChild(candidatesList);

                document.getElementById('deployedContractsList').appendChild(contractContainer);
                await populateCandidates(contractAddress, contractId);

                startLiveDurationUpdate(contractAddress, contractId);
            }
        }
    } catch (error) {
        console.error('Error fetching deployed contracts:', error);
    }
}



// Call fetchDeployedContracts when the page loads




// Call connect when the page loads
window.addEventListener('load', connect);

function toggleCandidates(contractId) {
    const candidatesList = document.getElementById(`candidatesList_${contractId}`);
    const voteButton = document.querySelector(`#candidatesList_${contractId} .vote-button`);

    if (candidatesList) {
        const candidatesCount = candidatesList.children.length;

        if (candidatesCount === 0) {
            console.log('Candidates count is zero. Disabling toggle.');
            return;
        }

        const remainingTimeSeconds = document.getElementById(`duration_display_${contractId}`).textContent;
        if (remainingTimeSeconds === '00:00') {
            console.log('Voting has not started. Disabling toggle.');
            return;
        }

        candidatesList.style.display = candidatesList.style.display === 'block' ? 'none' : 'block';
    } else {
        console.error(`Candidates list not found for contractId: ${contractId}`);
    }
}
