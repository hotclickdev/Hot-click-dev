package com.hotclick.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class PaymentWebhookDTO {

    private String merchantToken;
    private String status;
    private String errorCode;
    private String errorMessage;
    private Long   amount;
    private String currency;
    private String orderID;
    private String transactionID;
    private String paymentMethod;
    private String last4;
    private String cardBrand;
    private String ctrlCustomData;

    public String getMerchantToken() { return merchantToken; }
    public void setMerchantToken(String merchantToken) { this.merchantToken = merchantToken; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getErrorCode() { return errorCode; }
    public void setErrorCode(String errorCode) { this.errorCode = errorCode; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public Long getAmount() { return amount; }
    public void setAmount(Long amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getOrderID() { return orderID; }
    public void setOrderID(String orderID) { this.orderID = orderID; }

    public String getTransactionID() { return transactionID; }
    public void setTransactionID(String transactionID) { this.transactionID = transactionID; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getLast4() { return last4; }
    public void setLast4(String last4) { this.last4 = last4; }

    public String getCardBrand() { return cardBrand; }
    public void setCardBrand(String cardBrand) { this.cardBrand = cardBrand; }

    public String getCtrlCustomData() { return ctrlCustomData; }
    public void setCtrlCustomData(String ctrlCustomData) { this.ctrlCustomData = ctrlCustomData; }
}
