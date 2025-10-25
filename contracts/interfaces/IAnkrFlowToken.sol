// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IAnkrFlowToken
 * @dev Interface for ankrFLOW token - the liquid staking token representing staked FLOW
 * @notice This is an ERC20-compliant token that represents a user's share in the staking pool
 */
interface IAnkrFlowToken {
    /**
     * @dev Returns the amount of tokens in existence
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the amount of tokens owned by account
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves amount tokens from the caller's account to to
     * Returns a boolean value indicating whether the operation succeeded
     */
    function transfer(address to, uint256 amount) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that spender will be
     * allowed to spend on behalf of owner through transferFrom
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets amount as the allowance of spender over the caller's tokens
     * Returns a boolean value indicating whether the operation succeeded
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @dev Moves amount tokens from from to to using the allowance mechanism
     * amount is then deducted from the caller's allowance
     * Returns a boolean value indicating whether the operation succeeded
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool);

    /**
     * @dev Returns the name of the token
     */
    function name() external view returns (string memory);

    /**
     * @dev Returns the symbol of the token
     */
    function symbol() external view returns (string memory);

    /**
     * @dev Returns the decimals places of the token
     */
    function decimals() external view returns (uint8);

    // Events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}