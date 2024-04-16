let factoryContract;
let deployedContracts = {};

async function connect() {
    if (window.ethereum) {
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            web3 = new Web3(window.ethereum);
            const newAccount = (await web3.eth.getAccounts())[0];
            
            if (web3.eth.defaultAccount !== newAccount) {
                console.log('Account changed. Clearing local storage...');
                localStorage.removeItem('deployedContracts');
            }

            web3.eth.defaultAccount = newAccount;
            console.log('Connected account:', web3.eth.defaultAccount);
            
            initializeContract();
            displayWalletAddress(newAccount);
        } catch (error) {
            console.error('Connection error:', error);
            alert('Failed to connect to wallet. Please check the console for details.');
        }
    } else {
        console.log('No wallet available');
        alert('No wallet available');
    }
}

function displayWalletAddress(newAccount) {
    const connectButton = document.getElementById('connectButton');
    if (newAccount) {
        const shortaddr = newAccount.substring(0, 6);
        connectButton.innerHTML = `Connected : ${shortaddr}`;
        connectButton.removeAttribute('onclick');
    } else {
        connectButton.textContent = 'Connect Wallet';
        connectButton.setAttribute('onclick', 'connect()');
    }
}

async function initializeContract() {
    try {
        const storedContracts = localStorage.getItem('deployedContracts');
        if (storedContracts) {
            deployedContracts = JSON.parse(storedContracts);
            console.log('Retrieved deployed contracts from local storage:', deployedContracts);
            displayDeployedContracts(deployedContracts);
        } else {
            await fetchAndDisplayContracts();
        }
    } catch (error) {
        console.error('Error initializing contract:', error);
        alert('Failed to initialize contract. Please check the console for details.');
    }
}

async function fetchAndDisplayContracts() {
    try {
        factoryContract = new web3.eth.Contract(factoryabi, factorycontractAddress);
        console.log('Factory contract initialized successfully.');
        
        const fetchedContracts = await factoryContract.methods.getDeployedContractsFromSender().call({ from: web3.eth.defaultAccount });
        console.log('Fetched deployed contracts:', fetchedContracts);

        const contractAddresses = fetchedContracts[0];
        const contractNames = fetchedContracts[1];

        if (contractAddresses.length === 0 || contractAddresses.length !== contractNames.length) {
            console.error('Fetched contracts are empty or not in expected format.', fetchedContracts);
            alert('Failed to fetch deployed contracts. Please check the console for details.');
            return;
        }

        deployedContracts = contractAddresses.map((address, index) => ({
            address,
            name: contractNames[index],
            deployer: web3.eth.defaultAccount
        }));

        console.log('Contracts deployed by the user:', deployedContracts);
        localStorage.setItem('deployedContracts', JSON.stringify(deployedContracts));
        displayDeployedContracts(deployedContracts);
    } catch (error) {
        console.error('Error fetching and displaying contracts:', error);
        
    }
}

async function clearLocalStorage() {
    localStorage.removeItem('deployedContracts');
    console.log('Local storage cleared');
    alert('Local storage cleared. Refresh the page to load contracts for the current account.');
}

async function calculateRemainingTime(contractAddress) {
    try {
        const voteContract = new web3.eth.Contract(voteBaseContractABI, contractAddress);
        const remainingTime = await voteContract.methods.getRemainingTime().call();
        return remainingTime;
    } catch (error) {
        console.error('Error fetching remaining time:', error);
        return 0;
    }
}

async function displayDeployedContracts(contracts) {
    try {
        if (!Array.isArray(contracts) || contracts.length === 0) {
            console.error('Error: Contracts data is empty or not in expected format.');
            alert('No deployed contracts found.');
            return;
        }

        console.log('Contracts:', contracts);

        const deployedContractsList = document.getElementById('deployedContractsList');
        if (!deployedContractsList) {
            console.error('Error: Deployed contracts list element not found.');
            return;
        }

        deployedContractsList.innerHTML = '';

        const currentUserAddress = web3.eth.defaultAccount;
        const filteredContracts = contracts.filter(contract => contract.deployer === currentUserAddress);

        if (filteredContracts.length === 0) {
            console.log('No contracts deployed by the current user.');
            alert('No contracts deployed by the current user.');
            return;
        }

        filteredContracts.forEach(async contract => {
            const contractDiv = document.createElement('div');
            contractDiv.classList.add('contract-item');
        
            const addressDiv = document.createElement('div');
            addressDiv.textContent = `Address: ${contract.address}`;
        
            const nameDiv = document.createElement('div');
            nameDiv.textContent = `Name: ${contract.name}`;
        
            // Fetch remaining time from the blockchain contract
            const remainingTimeSeconds = await calculateRemainingTime(contract.address);
            const remainingTimeMinutes = Math.floor(remainingTimeSeconds / 60); // Convert seconds to minutes
            console.log('Remaining Time (Minutes):', remainingTimeMinutes);
        
            const durationInput = document.createElement('input');
            durationInput.type = 'number';
            durationInput.placeholder = 'Enter duration in minutes';
        
            const setDurationButton = document.createElement('button');
            setDurationButton.textContent = 'Set Duration';
            setDurationButton.onclick = async () => {
                const remainingTime = await calculateRemainingTime(contract.address); // Fetch remaining time again
                if (remainingTime > 0) {
                    alert('Duration cannot be changed once set and the voting has started.');
                    return;
                }
                const durationMinutes = durationInput.value.trim();
                if (durationMinutes === '' || isNaN(durationMinutes) || durationMinutes <= 0) {
                    alert('Please enter a valid duration in minutes.');
                    return;
                }
                await setDuration(contract.address, durationMinutes);
                alert('Duration set successfully!');
            };
        
            const candidateInput = document.createElement('input');
            candidateInput.type = 'text';
            candidateInput.placeholder = 'Enter subject or proposal name';
        
            const addCandidateButton = document.createElement('button');
            addCandidateButton.textContent = 'Add Candidate';
            addCandidateButton.onclick = async () => {
                const remainingTime = await calculateRemainingTime(contract.address); // Fetch remaining time again
                if (remainingTime > 0) {
                    alert('Candidates cannot be added once the voting has started.');
                    return;
                }
                const candidateName = candidateInput.value.trim();
                if (candidateName === '') {
                    alert('Please enter a valid candidate name.');
                    return;
                }
                await addCandidate(contract.address, candidateName);
                alert('Candidate added successfully!');
            };
        
            // Check if remaining time is greater than 0
            if (remainingTimeMinutes > 0) {
                durationInput.style.display = 'none';
                setDurationButton.style.display = 'none';
                candidateInput.style.display = 'none';
                addCandidateButton.style.display = 'none';
            }
        
            contractDiv.appendChild(addressDiv);
            contractDiv.appendChild(nameDiv);
        
            // Add remaining time display
            const remainingTimeDiv = document.createElement('div');
            remainingTimeDiv.textContent = `Remaining Time: ${remainingTimeMinutes} minutes`;
            contractDiv.appendChild(remainingTimeDiv);
        
            contractDiv.appendChild(durationInput);
            contractDiv.appendChild(setDurationButton);
            contractDiv.appendChild(candidateInput);
            contractDiv.appendChild(addCandidateButton);
        
            deployedContractsList.appendChild(contractDiv);
        });
        

        console.log('Deployed Contracts:', filteredContracts);
    } catch (error) {
        console.error('Error displaying deployed contracts:', error);
    }
}






async function deployContract() {
    try {
        factoryContract = new web3.eth.Contract(factoryabi, factorycontractAddress);
        const contractNameInput = document.getElementById('contractName');
        const contractName = contractNameInput.value.trim();

        if (!contractName) {
            console.error('Error: Contract name is required.');
            alert('Failed to deploy contract. Contract name is required.');
            return;
        }

        const tx = await factoryContract.methods.createVoteContract(contractName).send({ from: web3.eth.defaultAccount });
        console.log('Transaction Hash:', tx.transactionHash);
        alert('VoteBaseContract deployed successfully!');

        const updatedContracts = await fetchDeployedContracts();
        displayDeployedContracts(updatedContracts);
    } catch (error) {
        console.error('Error deploying contract:', error);
        alert('Failed to deploy contract. Please check the console for details.');
    }
}


async function fetchDeployedContracts() {
    try {
        const result = await factoryContract.methods.getDeployedContractsFromSender().call({ from: web3.eth.defaultAccount });
        const contractAddresses = result[0];
        const contractNames = result[1];

        deployedContracts = contractAddresses.map((address, index) => ({
            address,
            name: contractNames[index],
            deployer: web3.eth.defaultAccount
        }));

        console.log('Deployed Contracts:', deployedContracts);
        localStorage.setItem('deployedContracts', JSON.stringify(deployedContracts));
        displayDeployedContracts(deployedContracts);
    } catch (error) {
        console.error('Error fetching deployed contracts:', error);
        alert('Failed to fetch deployed contracts. Please check the console for details.');
    }
}

async function setDuration(contractAddress, durationInMinutes) {
    try {
        const contract = new web3.eth.Contract(voteBaseContractABI, contractAddress);
        const tx = await contract.methods.startVoting(durationInMinutes).send({ from: web3.eth.defaultAccount });
        console.log('Set Duration Transaction Hash:', tx.transactionHash);
        alert('Duration set successfully!');
    } catch (error) {
        console.error('Error setting duration:', error);
        alert('Failed to set duration. Please check the console for details.');
    }
}

async function addCandidate(contractAddress, candidateName) {
    try {
        const contract = new web3.eth.Contract(voteBaseContractABI, contractAddress);
        const tx = await contract.methods.addCandidate(candidateName).send({ from: web3.eth.defaultAccount });
        console.log('Add Candidate Transaction Hash:', tx.transactionHash);
        alert('Candidate added successfully!');
    } catch (error) {
        console.error('Error adding candidate:', error);
        alert('Failed to add candidate. Please check the console for details.');
    }
}


document.addEventListener('DOMContentLoaded', async () => {
    const storedAddress = localStorage.getItem('walletAddress');
    if (storedAddress) {
        // Connect wallet automatically if stored address exists
        console.log('Stored wallet address:', storedAddress);
        await connect(); // Call the connect function to connect the wallet
    }
});

// Call initializeContract after connecting the wallet automatically
window.addEventListener('load', async () => {
    await initializeContract(); // Initialize contracts after connecting wallet
});