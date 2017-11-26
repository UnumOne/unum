pragma solidity ^0.4.15;

contract IPriceInUSDOracle  {
    
    function setPriceInUSD(string _name, uint256 _priceInUSD) {}
    
    function getPriceInUSD(string _name) constant returns (uint256){}
    
    function getLastUpdated(string _name) constant returns (uint256){}
    
    function addItem(string _name) {}
    
    function hasItem(string _name) constant returns (bool) {}
    
    function getNameIndex(string _name) internal returns (uint256) {}
    
    function getNameIndexOrThrow(string _name) returns (uint256) {}
}