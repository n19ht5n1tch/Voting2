let web3;
let accounts;

async function connect() {
  if (window.ethereum) {
    try {
      const storedAddress = localStorage.getItem('walletAddress');
      if (storedAddress) {
        console.log('Using stored wallet address:', storedAddress);
        web3 = new Web3(window.ethereum);
        displayWalletAddress(storedAddress);
        
        
        initializeContract();
        startPing();
        return;
      }

      accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      web3 = new Web3(window.ethereum);
      const address = accounts[0];
      console.log('Connected account:', address);
      displayWalletAddress(address);
      localStorage.setItem('walletAddress', address);
      alert("Wallet connected");
      initializeContract();
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
  const shortaddr = address.substring(0,6);
  if (address) {
    connectButton.innerHTML = `Connected : ${shortaddr}`;
    connectButton.removeAttribute('onclick');
  } else {
    connectButton.textContent = 'Connect Wallet';
    connectButton.setAttribute('onclick', 'connect()');
  }
}

async function addMaticNetwork() {
  try {
    const result = await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: "0x13882",
        rpcUrls: ["https://rpc-amoy.polygon.technology"],
        chainName: "Amoy Testnet",
        nativeCurrency: {
          name: "MATIC",
          symbol: "MATIC",
          decimals: 18
        },
        blockExplorerUrls: ["https://www.oklink.com/amoy"]
      }]
    });
  } catch (error){
    console.log(error)
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

function clearWalletAddress() {
  const walletInfoDiv = document.getElementById('walletInfo');
  walletInfoDiv.innerHTML = ''; // Clear the displayed address
}

function displayConnectButton() {
  const connectButton = document.getElementById('connectButton');
  connectButton.style.display = 'block'; // Display the connect button
}

// Check if wallet address is stored in local storage on page load
document.addEventListener('DOMContentLoaded', async () => {
  const storedAddress = localStorage.getItem('walletAddress');
  if (storedAddress) {
    // Initialize Web3 if not already initialized
    if (!web3) {
      const web3Initialized = await loadWeb3();
      if (web3Initialized) {
        displayWalletAddress(storedAddress);
        alert("Wallet connected");
      } else {
        console.error('Web3 initialization failed.');
      }
    }
  }

  // Listen for accountsChanged event
  window.ethereum.on('accountsChanged', handleAccountsChanged);
});

async function loadWeb3() {
  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      return true;
    } catch (error) {
      console.error('User denied account access:', error);
      return false;
    }
  } else {
    console.log('Non-Ethereum browser detected. You should consider trying MetaMask.');
    return false;
  }
}








