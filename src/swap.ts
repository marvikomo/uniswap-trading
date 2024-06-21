import {
  getWalletAddress,
  getWalletBalance,
  getProvider,
  sendTransaction,
  TransactionState,
  getContract
} from './provider'
import { BaseProvider } from '@ethersproject/providers'
import {
  ERC20_ABI,
  V3_SWAP_ROUTER_ADDRESS,
  MAX_FEE_PER_GAS,
  MAX_PRIORITY_FEE_PER_GAS,
} from './constants'
import { ethers, BigNumber } from 'ethers'

import {
  AlphaRouter,
  SwapOptionsSwapRouter02,
  SwapRoute,
  SwapType,
} from '@uniswap/smart-order-router'

import {
  Trade,
} from '@uniswap/v3-sdk'

import {
  ChainId,
  TradeType,
  CurrencyAmount,
  Percent,
  Token,
} from '@uniswap/sdk-core'
import { fromReadableAmount } from './util/conversion'

export type TokenTrade = Trade<Token, Token, TradeType>

/**
 * Fetches a trade route for the given token pair and amount.
 * 
 * @param tokenA - The input token for the swap.
 * @param tokenB - The output token for the swap.
 * @param amountIn - The amount of `tokenA` to swap.
 * @returns A promise that resolves to the route details.
 */
 export async function getRoute(tokenA, tokenB, amountIn) {
  // Initialize the AlphaRouter with a provider and chain ID
  const router = new AlphaRouter({
    chainId: ChainId.BASE,
    provider: getProvider() as BaseProvider,
  });

  // Set options for the swap, including slippage and deadline
  const options: SwapOptionsSwapRouter02 = {
    recipient: getWalletAddress(), // Address to receive the output tokens
    slippageTolerance: new Percent(50, 10_000), // 0.5% slippage tolerance
    deadline: Math.floor(Date.now() / 1000 + 1800), // Deadline in UNIX timestamp (30 minutes from now)
    type: SwapType.SWAP_ROUTER_02, // Using SwapRouter02 type for the swap
  };

  try {
    // Execute the route method to find the best trade route
    return await router.route(
      CurrencyAmount.fromRawAmount(
        tokenA,
        fromReadableAmount(+amountIn, tokenA.decimals).toString(),
      ),
      tokenB,
      TradeType.EXACT_INPUT,
      options,
    );
  } catch (error) {
    console.error('Failed to get the route:', error);
    throw error; // Re-throw the error for further handling by the caller
  }
}


/**
 * Executes a token swap using a specified trading route and approval token.
 * 
 * @param route - The trading route to use for the swap, typically includes path and other trade specifics.
 * @param approvalToken - The token for which the swap has been approved.
 * @returns A promise that resolves with the result of the swap operation.
 */
 export async function swap(route: SwapRoute, approvalToken: Token) {
  console.log('Wallet address is: ', getWalletAddress());

  try {
    // Retrieve and log the current wallet balance
    const balance = await getWalletBalance();
    console.log('Balance is:', balance);

    // Perform the swap operation
    return await executeSwapRoute(route, approvalToken);
  } catch (error) {
    console.error('Failed to execute swap:', error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

/**
 * Executes a swap operation using a predefined trading route.
 * It ensures the wallet is connected and the necessary token approvals are granted before sending the swap transaction.
 *
 * @param {SwapRoute} route - The swap route to be executed, containing transaction parameters.
 * @param {Token} approvalToken - The token for which transfer approval is required.
 * @returns {Promise<TransactionState | undefined>} The result of the transaction or undefined in case of failure.
 */

export async function executeSwapRoute(
  route: SwapRoute,
  approvalToken: Token,
): Promise<any> {
  try {
   // Retrieve wallet address and provider from the environment or service.
   const walletAddress = getWalletAddress();
   const provider = getProvider();

   // Check if both wallet and provider are properly connected.
   if (!walletAddress || !provider) {
     console.error('Cannot execute a trade without a connected wallet or provider.');
     return TransactionState.Failed;
   }

   // Request transfer approval for the token to be traded.
   const tokenApproval = await getTokenTransferApproval(approvalToken);
   if (tokenApproval !== TransactionState.Sent) {
     console.error('Token transfer approval failed.');
     return TransactionState.Failed;
   }

   // Prepare and send the swap transaction using the route's method parameters.
   const transactionResponse: TransactionState = await sendTransaction({
     data: route.methodParameters?.calldata,
     to: V3_SWAP_ROUTER_ADDRESS,
     value: route?.methodParameters?.value,
     from: walletAddress,
     maxFeePerGas: MAX_FEE_PER_GAS,
     maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
     gasLimit: 6500000,  // Define a standard gas limit or adjust based on the operation complexity.
   });
   // Return the result of the transaction.
   return transactionResponse;

  } catch (error) {
    console.log('error', error)
  }
}

/**
 * Retrieves the balance of a specified ERC20 token for a user's wallet address.
 *
 * @param {string} tokenAddress - The blockchain address of the ERC20 token.
 * @returns {Promise<string>} The token balance in human-readable format (Ether units).
 */

/**
 * Retrieves the allowance for a token and approves a larger amount if necessary.
 * This ensures that the swap router can spend the token on the user's behalf.
 *
 * @param {Token} token - The token object containing the address and decimal information.
 * @returns {Promise<TransactionState>} The state of the transaction, either successful or failed.
 */
export async function getTokenTransferApproval(
  token: Token,
): Promise<TransactionState> {
  const provider = getProvider()
  const address = getWalletAddress()
  if (!provider || !address) {
    return TransactionState.Failed
  }

  try {
    // Create a new contract instance with the provider.
    const tokenContract: ethers.Contract = getContract(
      token.address,
      ERC20_ABI
    )
    // Check the current allowance the router has on the user's tokens.
    const allowance = await tokenContract.allowance(
      address,
      V3_SWAP_ROUTER_ADDRESS,
    )
    console.log('Current Allowance: ', allowance.toString())

    // If the allowance is insufficient, approve a larger amount.
    if (allowance.eq(0)) {
      // using BigNumber comparison
      const approvalAmount = ethers.utils.parseUnits('10000000', token.decimals)
      const transaction = await tokenContract.populateTransaction.approve(
        V3_SWAP_ROUTER_ADDRESS,
        approvalAmount,
      )

      // Send the transaction with the populated fields.
      return await sendTransaction({
        ...transaction,
        from: address,
      })
    } else {
      // Allowance is sufficient; no transaction needed.
      console.log("Allowance is sufficient ....")
      return TransactionState.Sent
    }
  } catch (e) {
    console.error(e)
    return TransactionState.Failed
  }
}
