Korbit API Sample Client
===

This application is made based on the [Node.js Chat](https://github.com/geekuillaume/Node.js-Chat) by [Geekuillaume](http://geekuillau.me/), which utilizes Node.js, Express, Socket.io, Jade, and Bootstrap from Twitter.

## Install the node modules :

    - Go to the project directory and use this command
    - npm install

## Customize the installation :

    - Input your Korbit API clientID and clientSecret in the config.js file.
    - You can also set the port in config.js. By default it is set to 8080.

## How to use :

    - node server.js
    - Go to IP:port from any (recent) navigator to start chatting !

## How to chat with Korbit :
  
  - 계정 정호

        info
  
  - 최종 체결 가격

        price

  - 시장 현황 주문

        asks

    -

        bids

  - 매도 주문

        sell [BTC 개수] at [KRW 가격]

  - 매수 주문

        buy [BTC 개수] at [KRW 가격]

  - 체결 내역
 
        tx

  - 사용자의 미 체결 주문내역

        pending orders

  - 사용자의 체결된 주문내역

        fills
  
  - 지갑 정보 보기 
  
        wallet

  - 사용자의 원화 입출금 상태

        pending fiats

  - 사용자의 채결된 원화 입출금

        fiats

  - 원화 출금 요청
    
        withdraw [KRW 개수]

  - 원화 입금계좌 할당
  
        register [은행명] [계좌전호]

  - 사용자의 비트코인 입출금 상태
  
        pending btcs

  - 사용자의 채결된 비트코인 입출금
  
        btcs

  - 비트코인 출금

        send [BTC 개수] to [BTC 주소]

---

### Credits

Based on [Node.js Chat](https://github.com/geekuillaume/Node.js-Chat) by [Geekuillaume](http://geekuillau.me/)

Korbit: [https://www.korbit.co.kr](https://www.korbit.co.kr)