package com.gloyoo.messages;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients
public class MessagesApplication {

    public static void main(String[] args) {
        SpringApplication.run(MessagesApplication.class, args);
    }

}
