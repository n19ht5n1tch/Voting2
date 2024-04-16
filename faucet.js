let claimedAddresses = {};

async function claim() {
    try {
        const amountToSend = web3.utils.toWei('0.01', 'ether'); // Amount in native Matic tokens
        const recipientAddress = await web3.eth.getCoinbase(); // Get the connected wallet address

        // Check if the claim has already been made for this address
        if (claimedAddresses[recipientAddress] && Date.now() - claimedAddresses[recipientAddress] < 5 * 60 * 1000) {
            console.error('Address has already claimed within the last 5 minutes.');
            disableClaimButton();
            return;
        }

        // Check if the address has received a transaction from 0x41974F59E578D491bCb935Ac37f544029cb21254 in the last 5 minutes
        const blockNumber = await web3.eth.getBlockNumber();
        const latestBlock = await web3.eth.getBlock(blockNumber);
        const transactions = latestBlock.transactions;

        const receivedFromSpecificAddress = transactions.some(async txHash => {
            const tx = await web3.eth.getTransaction(txHash);
            const txReceipt = await web3.eth.getTransactionReceipt(txHash);
            return tx.to.toLowerCase() === recipientAddress.toLowerCase() && txReceipt.from.toLowerCase() === '0x41974f59e578d491bcb935ac37f544029cb21254' && Date.now() - new Date(txReceipt.blockTimestamp * 1000) < 5 * 60 * 1000;
        });

        if (receivedFromSpecificAddress) {
            console.error('Address has received a transaction from the specific address within the last 5 minutes.');
            disableClaimButton();
            return;
        }

        // Proceed with the claim logic
        const txObject = {
            from: web3.eth.defaultAccount,
            to: recipientAddress,
            value: amountToSend,
            gas: 3000000, // Adjust the gas limit as needed
            gasPrice: web3.utils.toWei('10', 'gwei'), // Adjust the gas price as needed
        };

        const signedTx = await web3.eth.accounts.signTransaction(txObject, '0xf76dbbd8ca3d406b6db141092ba6001244f45c1a41b9f688899e689e85c281b9'); // Replace 'PRIVATE_KEY_HERE' with your private key
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

        console.log('Transaction Hash:', receipt.transactionHash);
        console.log('Transaction Receipt:', receipt);

        // Update the claimedAddresses object with the current time for the recipientAddress
        claimedAddresses[recipientAddress] = Date.now();

        // Set a timeout to clear the claimed address after 5 minutes
        setTimeout(() => {
            delete claimedAddresses[recipientAddress];
            console.log('5 minutes timeout completed for', recipientAddress);
            enableClaimButton(); // Enable claim button after timeout and change its text to 'Claim'
            // Add any post-timeout logic here
        }, 5 * 60 * 1000);
        displayCountdown(5 * 60); // 5 minutes in milliseconds
    } catch (error) {
        console.error('Transaction Error:', error);
    }
}

function displayCountdown(durationInSeconds) {
    let secondsRemaining = durationInSeconds;

    const countdownInterval = setInterval(() => {
        if (secondsRemaining <= 0) {
            clearInterval(countdownInterval);
            alert('Next claim available'); // Display alert message when countdown reaches zero
            return;
        }

        secondsRemaining--;
    }, 1000); // Update every second (1000 milliseconds)
}

function disableClaimButton() {
    const claimButton = document.querySelector('.claimbtn'); // Select the claim button using its class
    claimButton.disabled = true;
    claimButton.textContent = 'Claimed';
}

function enableClaimButton() {
    const claimButton = document.querySelector('.claimbtn'); // Select the claim button using its class
    claimButton.disabled = false;
    claimButton.textContent = 'Claim';
    alert('You can claim again after the timeout period.'); // Enable the claim button again
    displayCountdown(5 * 60);
}
