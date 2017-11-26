pragma solidity ^0.4.15;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import './interfaces/IERC20Token.sol';

contract PriceInUSDOracle is Ownable {
    
    struct Item{
        string name;
        uint256 priceInUSD;
        uint lastUpdatedBlock;
    }
 
    mapping (uint256 => Item) private items;
    uint256 private nameIndex;

    ///////////////////////////////////////////////////
    // Events
    ///////////////////////////////////////////////////
    event LogItemAdded(string _name);
    event LogItemPriceSet(string _name, uint256 _price);


    ///////////////////////////////////////////////////
    // Owner restricted functions
    ///////////////////////////////////////////////////

    /**
        @dev Lets the owner add an item to the oracle.

        @param  _name   the name of the item.
    */
    function addItem(string _name) public onlyOwner {
        require(!hasItem(_name));
        nameIndex++;
        items[nameIndex].name = _name;
        LogItemAdded(_name);
    }
    
    /**
        @dev Lets the owner set the price of an item known to the oracle.

        @param  _name               the name of the item.
        @param  _priceInUSD         The US dollar value of the item. Should be stored with 18 decimals.
    */
    function setPriceInUSD(string _name, uint256 _priceInUSD) public onlyOwner{
        uint256 nameIndex = getNameIndexOrThrow(_name);
        items[nameIndex].priceInUSD = _priceInUSD;
        items[nameIndex].lastUpdatedBlock = block.timestamp;
        LogItemPriceSet(_name, _priceInUSD);
    }

    ///////////////////////////////////////////////////
    // Public functions to get data
    ///////////////////////////////////////////////////

    /**
        @dev Lets anyone retrieve a price stored in the oracle.

        @param  _name   the name of the item.

        @return price of the item stored in the oracle
    */  
    function getPriceInUSD(string _name) public constant returns (uint256){
        uint256 nameIndex = getNameIndexOrThrow(_name);
        return items[nameIndex].priceInUSD;
    }

    /**
        @dev Lets anyone retrieve the block number of the last time the price was updated.

        @param  _name   the name of the item.

        @return block number of the last time the item price was updated.
    */    
    function getLastUpdated(string _name) public constant returns (uint256){
        uint256 nameIndex = getNameIndexOrThrow(_name);
        return items[nameIndex].lastUpdatedBlock;
    }
    
    /**
        @dev Lets anyone see if an item name is known to the oracle.

        @param  _name   the name of the item.

        @return true/false as to whether the oracle knows that item.
    */
    function hasItem(string _name) public constant returns (bool) {
        uint256 index = getNameIndex(_name);
        if (index == 0) {
            return false;
        }
        return true;
    }

    ///////////////////////////////////////////////////
    // Internal functions
    ///////////////////////////////////////////////////

    /**
        @dev Retrieves the index of the array that contains the name.

        @param  _name   the name of the item.

        @return array index or 0.
    */ 
    function getNameIndex(string _name) internal returns (uint256) {
        for (uint256 i = 1; i <= nameIndex; i++) {
            if (stringsEqual(items[i].name, _name)) {
                return i;
            }
        }
        return 0;
    }
    
    /**
        @dev Retrieves the index of the array that contains the name,
        or throws if the item is not in the array.

        @param  _name   the name of the item.

        @return array index.
    */ 
    function getNameIndexOrThrow(string _name) returns (uint256) {
        uint256 index = getNameIndex(_name);
        require(index > 0);
        return index;
    }

    /**
        @dev Determines if two strings are thesame

        @param _a   string 1
        @param _b   string 2

        @return true/false for equal/not equal.
    */ 
    
    function stringsEqual(string storage _a, string memory _b) internal returns (bool) {
        bytes storage a = bytes(_a);
        bytes memory b = bytes(_b);
        if (a.length != b.length) {
            return false;
        }
        // @todo unroll this loop
        for (uint i = 0; i < a.length; i ++) {
            if (a[i] != b[i]) {
                return false;
            }
        }
        return true;
    }
}