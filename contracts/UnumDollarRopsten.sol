pragma solidity ^0.4.15;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/token/StandardToken.sol';

import './interfaces/IPriceInUSDOracle.sol';

contract UnumDollarRopsten is StandardToken, Ownable{
    
    string public constant name = "Unum Dollar";
    string public constant symbol = "UD1";
    uint8 public constant decimals = 18;

    uint constant WAD = 10 ** 18;
    uint constant RAY = 10 ** 27;

    uint256 public constant ONE_PERCENT = WAD / 100;    // 1% of 1 unum, used for bonus sale calculations.
    uint256 public constant FEE_RATE = ONE_PERCENT / 20;// 1/20th of 1 percent.

    uint256 public ethFeeBalance = 0;                   // Balance of conversion fees collected in Eth.
    uint256 public totalCreated = 0;                    // The number of tokens ever created.
    /*
    uint256 public bonusSaleStartTime = 0;              // the time the bonus sale started (in seconds).
    uint256 public bonusSaleEndTime = 0;                // the time bonus sale will end or ended (in seconds).
    uint256 public bonusSaleUnumCap = 0;                // Maximum unum to issue during the bonus sale.
    uint256 public bonusSaleUnumIssued = 0;             // amount of unum issued during the bonus sale.
    */

    IPriceInUSDOracle public priceOracle;               // Address of the Price In USD Oracle

    bool isEthBuyingDisabled = false;                   // Whether or not purchases are disabled for Eth

    struct ReserveToken {
        string name;                                    // Store the name since we can't pass it yet in solidity
        ERC20 token;                                    // Address of the reserve token contract
        uint256 feeBalance;                             // Amount of conversion fee collected for this token
        bool isBuyingDisabled;                          // Whether purchases are disabled for this token
    }    
    mapping (uint256 => ReserveToken) public reserveTokens;    // Supported token mapping
    uint256 public reserveTokenIndex;                          // Count of the number of supported tokens

    ///////////////////////////////////////////////////
    // Events
    ///////////////////////////////////////////////////

    // triggered when support is added for a new ERC20 token
    event TokenSupportAdded(string _name, ERC20 _token);

    // triggered when the oracle address is changed
    event OracleAddressSet(IPriceInUSDOracle _oracleAddress);
    
    // Triggered when Unum is sold for a token or Eth
    event Sell(string _soldFor, uint256 _numUnumIn, uint256 _numCurrencyOut);

    // Triggered when unum is bought for a token or eth
    event Buy(string _boughtWith, uint256 _amountCurrencyIn, uint256 _numUnumSold);

    // Triggered when a bonus sale is started
    //event BonusSale(uint256 _startTime, uint256 _endTime, uint256 _unumCap);
    
    ///////////////////////////////////////////////////
    // Modifiers
    ///////////////////////////////////////////////////
    
    // verifies that an amount is greater than zero
    modifier greaterThanZero(uint256 _amount) {
        require(_amount > 0);
        _;
    }

    // verifies that that address has a minimum amount of unum
    modifier hasMinimumUnumBalance(address _user, uint256 _amount){
        require(balances[_user] >= _amount);
        _;
    }

    modifier purchasesNotDisabled(string _name){
        if (keccak256(_name) == keccak256("ETH")){
            require(isEthBuyingDisabled == false);
        } else {
            uint256 index = getTokenIndexOrThrow(_name);
            require(reserveTokens[index].isBuyingDisabled == false);
        }
        _;
    }

    ///////////////////////////////////////////////////
    // Owner restricted functions
    ///////////////////////////////////////////////////
    function setPriceInUSDOracleAddress(IPriceInUSDOracle _tokenPricesOracleAddress) 
        public 
        onlyOwner
    {
        priceOracle = IPriceInUSDOracle(_tokenPricesOracleAddress);
        OracleAddressSet(priceOracle);
    }

    function addToken(string _tokenName, ERC20 _token) 
        public 
        onlyOwner 
        returns (bool)
    {
        require(!supportsToken(_tokenName));       
        
        // basic test that the address probably is an ERC20 token
        ERC20 token = ERC20(_token);
        require(token.balanceOf(this) >= 0);

        reserveTokenIndex++;
        reserveTokens[reserveTokenIndex] = ReserveToken(_tokenName, _token, 0, false);
        TokenSupportAdded(_tokenName, _token);

        return true;
    }

    function setBuyingDisabled(string _name, bool _allowed)
        public
        onlyOwner
    {
        if (keccak256(_name) == keccak256("ETH")){
            isEthBuyingDisabled = _allowed;
        } else {
            uint256 index = getTokenIndexOrThrow(_name);
            reserveTokens[index].isBuyingDisabled = _allowed;
        }
    }

    function collectFees(string _name, uint256 _amount)
        public
        onlyOwner
    {
        if (keccak256(_name) == keccak256("ETH")){
            require(_amount <= ethFeeBalance);
            owner.transfer(_amount);
            ethFeeBalance = SafeMath.sub(ethFeeBalance, _amount);
        } else {
            uint256 index = getTokenIndexOrThrow(_name);        
            require(_amount <= reserveTokens[index].feeBalance);
            ERC20 token = ERC20(reserveTokens[index].token);
            assert(token.transfer(owner, _amount));
            reserveTokens[index].feeBalance = SafeMath.sub(reserveTokens[index].feeBalance, _amount);
        }
    }
    /*
    function startBonusSale(uint8 _saleLengthInDays, uint256 _unumCap)
        public
        onlyOwner
        greaterThanZero(_saleLengthInDays)
        greaterThanZero(_unumCap) 
        returns (bool)
    {
        // Bonus sales may only be held at most once per month
        require(now > (bonusSaleStartTime + (30 days)));

        // Bonus sales may not be longer than 10 days
        require(_saleLengthInDays <= 10);

        bonusSaleStartTime = now;
        bonusSaleEndTime = now + (_saleLengthInDays * 1 days);
        bonusSaleUnumCap = _unumCap;
        bonusSaleUnumIssued = 0;

        BonusSale(bonusSaleStartTime, bonusSaleEndTime, bonusSaleUnumCap);
    }
    */

    ///////////////////////////////////////////////////
    // Public functions
    ///////////////////////////////////////////////////
    /*
    function isBonusSaleRunning() public constant returns (bool){
        return (now >= bonusSaleStartTime && now < bonusSaleEndTime && bonusSaleUnumIssued < bonusSaleUnumCap);
    }

    function bonusRatePercent() public constant returns (uint256){
        if ( !isBonusSaleRunning() ){
            return 0;
        }
        return ((now - bonusSaleStartTime) / 86400) + 1;
    }
    */
    function expectedBuyReturn(string _name, uint256 _amount) 
        public 
        constant 
        greaterThanZero(_amount)
        returns (uint256)
    {
        uint256 bonus = 0;

        uint256 amountCurrencyInAfterDeductions = SafeMath.sub(_amount, conversionFee(_amount));
        uint256 unumToIssue = wmul(priceOracle.getPriceInUSD(_name), amountCurrencyInAfterDeductions);
        /*
        if (isBonusSaleRunning()){
            bonus = wmul(ONE_PERCENT * bonusRatePercent(), unumToIssue);
            if ( SafeMath.add(bonusSaleUnumIssued, bonus) > bonusSaleUnumCap){
                bonus = 0;
            }
        }
        */
        return (unumToIssue + bonus);
    }

    function expectedSellReturn(string _name, uint256 _amount) 
        public 
        constant 
        greaterThanZero(_amount)
        returns (uint256)
    {
        uint unumPenalty = reserveDeficitSellPenalty(_amount);
        uint amountUnum = SafeMath.sub(SafeMath.sub(_amount, unumPenalty), conversionFee(_amount));
        return wdiv(amountUnum, priceOracle.getPriceInUSD(_name));
    }

    function tokenFeeBalance(string _tokenName) 
        public 
        constant 
        returns (uint256)
    {
        uint256 index = getTokenIndexOrThrow(_tokenName);
        return reserveTokens[index].feeBalance;
    }

    function supportsToken(string _tokenName) 
        public 
        constant 
        returns (bool) 
    {
        uint256 index = getTokenIndex(_tokenName);
        if (index == 0) {
            return false;
        }
        return true;
    }
    
    function availableReserve(string _name) 
        public 
        constant 
        returns (uint256)
    {
        if (keccak256(_name) == keccak256("ETH")){
            return SafeMath.sub(this.balance, ethFeeBalance);            
        } else {
            uint256 index = getTokenIndexOrThrow(_name);
            ERC20 token = ERC20(reserveTokens[index].token);
            return SafeMath.sub(token.balanceOf(this), reserveTokens[index].feeBalance);
        }
    }

    function availableReserveInUSD() public constant returns (uint256){
        uint256 avail = availableReserve("ETH");
        uint256 reserveInUSD = 0;

        if (avail > 0){
            reserveInUSD = wmul(priceOracle.getPriceInUSD("ETH"), avail);
        }

        for (uint8 i = 1; i <= reserveTokenIndex; i++){
            avail = availableReserve(reserveTokens[i].name);
            uint256 tokenReserveInUSD = 0;
            if (avail > 0){
                tokenReserveInUSD = wmul(priceOracle.getPriceInUSD(reserveTokens[i].name), avail);
            }            
            reserveInUSD = SafeMath.add(reserveInUSD, tokenReserveInUSD);
        }
    
        return reserveInUSD;
    }

    function reserveDeficitSellPenalty(uint256 _amountUnumToSell) 
        public 
        constant 
        greaterThanZero(_amountUnumToSell) 
        returns (uint256)
    {
        uint256 currentReserveValue = availableReserveInUSD();
        
        require(_amountUnumToSell < currentReserveValue);
        
        uint256 newReserveValue = SafeMath.sub(currentReserveValue,_amountUnumToSell);
                
        if (newReserveValue >= totalSupply){
            return 0;
        } else {
            uint difference = totalSupply - newReserveValue;
            uint reserveDeficitPercent = wdiv(difference, totalSupply);            
            uint penaltyPercent = reserveDeficitPercent / 10;
            return wmul(_amountUnumToSell, penaltyPercent);
        }
    }
    
    function conversionFee(uint256 _amount) 
        public 
        constant          
        greaterThanZero(_amount)
        returns (uint256)
    {
        return wmul(_amount, FEE_RATE);
    }

    function buyWithEth() 
        public 
        payable 
        greaterThanZero(msg.value)
        purchasesNotDisabled("ETH")
        returns (bool)
    {
        return buyUnum(msg.sender, "ETH", msg.value);
    }

    function buyWithToken(string _tokenName, uint _amount)
        public
        greaterThanZero(_amount)
        purchasesNotDisabled(_tokenName)
        returns (bool)
    {
        uint256 index = getTokenIndexOrThrow(_tokenName);
        ERC20 token = ERC20(reserveTokens[index].token);

        require(token.allowance(msg.sender, this) >= _amount);
       
        assert(token.transferFrom(msg.sender, this, _amount));

        return buyUnum(msg.sender, _tokenName, _amount);
    }

    function sellForEth(uint256 _amountUnumToSell)
        public
        greaterThanZero(_amountUnumToSell)
        hasMinimumUnumBalance(msg.sender, _amountUnumToSell)
        returns (bool)
    {
        return sellUnum(msg.sender, "ETH", _amountUnumToSell);
    }
    
    function sellForToken(string _tokenName, uint256 _amountUnumToSell)
        public
        greaterThanZero(_amountUnumToSell)
        hasMinimumUnumBalance(msg.sender, _amountUnumToSell)
        returns (bool)
    {
        uint256 index = getTokenIndexOrThrow(_tokenName);
        ERC20 token = ERC20(reserveTokens[index].token);
        
        return sellUnum(msg.sender, _tokenName, _amountUnumToSell);
    }
    
    
    ///////////////////////////////////////////////////
    // Private functions
    ///////////////////////////////////////////////////

    function buyUnum(address _to, string _name, uint256 _amountCurrencyIn) private returns (bool){
        uint fee = conversionFee(_amountCurrencyIn);
        uint amountCurrencyInAfterDeductions = SafeMath.sub(_amountCurrencyIn, fee);        
        uint256 unumToIssue = wmul(priceOracle.getPriceInUSD(_name), amountCurrencyInAfterDeductions);
        /*
        if (isBonusSaleRunning()){
            uint256 bonus = wmul(ONE_PERCENT * bonusRatePercent(), unumToIssue);
            if ( SafeMath.add(bonusSaleUnumIssued, bonus) <= bonusSaleUnumCap){
                unumToIssue = SafeMath.add(unumToIssue, bonus);
                bonusSaleUnumIssued = SafeMath.add(bonusSaleUnumIssued, unumToIssue);
            }
        }
        */
        
        balances[_to] = SafeMath.add(balances[_to], unumToIssue);
        totalSupply = SafeMath.add(totalSupply, unumToIssue);
        totalCreated = SafeMath.add(totalCreated, unumToIssue);

        increaseFeeBalance(_name, fee);

        Buy(_name, _amountCurrencyIn, unumToIssue);
        return true;
    }

    function sellUnum(address _from, string _name, uint256 _amountUnumToSell) private returns (bool){
        uint unumPenalty = reserveDeficitSellPenalty(_amountUnumToSell);
        uint fee = conversionFee(_amountUnumToSell);
        uint amountUnum = SafeMath.sub(SafeMath.sub(_amountUnumToSell, unumPenalty), fee);
        uint amountCurrencyAfterDeductions = wdiv(amountUnum, priceOracle.getPriceInUSD(_name));

        require(availableReserve(_name) >= amountCurrencyAfterDeductions);
        
        balances[_from] = SafeMath.sub(balances[_from], _amountUnumToSell);
        totalSupply = SafeMath.sub(totalSupply, _amountUnumToSell);        

        increaseFeeBalance(_name, fee);
        sendCurrencyTo(_from, _name, amountCurrencyAfterDeductions);

        Sell(_name, _amountUnumToSell, amountCurrencyAfterDeductions);
        return true;
    }

    function increaseFeeBalance(string _name, uint256 _increaseAmount) private {
        if (keccak256(_name) == keccak256("ETH")){
            ethFeeBalance = SafeMath.add(ethFeeBalance, _increaseAmount);
        } else {
            uint256 index = getTokenIndexOrThrow(_name);
            reserveTokens[index].feeBalance = SafeMath.add(reserveTokens[index].feeBalance, _increaseAmount);
        }
    }

    function sendCurrencyTo(address _to, string _currencyName, uint256 _amount) private {
        if (keccak256(_currencyName) == keccak256("ETH")){
            _to.transfer(_amount);
        } else {
            uint256 index = getTokenIndex(_currencyName);
            ERC20 token = ERC20(reserveTokens[index].token);
            assert(token.transfer(_to, _amount));
        }
    }

    function getTokenIndex(string _name) private returns (uint256) {
        for (uint256 i = 1; i <= reserveTokenIndex; i++) {
            if (keccak256(_name) == keccak256(reserveTokens[i].name)){
                return i;
            }
        }
        return 0;
    }
    
    function getTokenIndexOrThrow(string _name) private returns (uint256) {
        uint256 index = getTokenIndex(_name);
        require(index > 0);
        return index;
    }

    function add(uint x, uint y) internal returns (uint z) {
        require((z = x + y) >= x);
    }

    function mul(uint x, uint y) internal returns (uint z) {
        require(y == 0 || (z = x * y) / y == x);
    }

    function wmul(uint x, uint y) internal returns (uint z) {
        z = add(mul(x, y), WAD / 2) / WAD;
    }

    function wdiv(uint x, uint y) internal returns (uint z) {
        z = add(mul(x, WAD), y / 2) / y;
    }

    /**
        @dev fallback function does nothing
    */
    function() public {
        revert();
    }
}