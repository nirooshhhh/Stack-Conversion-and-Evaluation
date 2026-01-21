// server.c
// gcc server.c mongoose.c -o server.exe -lws2_32 -lm -Dfseeko=fseek
#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include "mongoose.h"



int precedence(char c) {
    if (c == '+' || c == '-') return 1;
    if (c == '*' || c == '/') return 2;
    if (c == '^') return 3;
    return 0;
}




void infix_to_postfix(const char *expr, char *out) {
    char stack[256];
    int top = -1, k = 0;

    for (int i = 0; expr[i]; i++) {
        char c = expr[i];

        if (isspace(c)) continue;

        if (isalnum(c)) {
            out[k++] = c;
        }
        else if (c == '(') {
            stack[++top] = c;
        }
        else if (c == ')') {
            while (top >= 0 && stack[top] != '(')
                out[k++] = stack[top--];
            top--; // pop '('
        }
        else {
            while (top >= 0 &&
                   precedence(stack[top]) >= precedence(c))
                out[k++] = stack[top--];
            stack[++top] = c;
        }
    }

    while (top >= 0)
        out[k++] = stack[top--];

    out[k] = '\0';
}





void infix_to_prefix(const char *expr, char *prefix) {
    char rev[256], post[256];
    int len = strlen(expr), j = 0;

    for (int i = len - 1; i >= 0; i--) {
        if (expr[i] == '(') rev[j++] = ')';
        else if (expr[i] == ')') rev[j++] = '(';
        else rev[j++] = expr[i];
    }
    rev[j] = '\0';

    infix_to_postfix(rev, post);

    len = strlen(post);
    for (int i = len - 1, k = 0; i >= 0; i--)
        prefix[k++] = post[i];
    prefix[len] = '\0';
}



static void cb(struct mg_connection *c, int ev, void *ev_data) {
    if (ev == MG_EV_HTTP_MSG) {
        struct mg_http_message *hm = (struct mg_http_message *) ev_data;

        char expr[256], postfix[256], prefix[256];
        memset(expr, 0, sizeof(expr));

        mg_http_get_var(&hm->query, "expr", expr, sizeof(expr));

        for (int i = 0; expr[i]; i++) {
            if (expr[i] == ' ') expr[i] = '+';
        }

        if (mg_strcmp(hm->uri, mg_str("/api/full")) == 0) {

            infix_to_postfix(expr, postfix);
            infix_to_prefix(expr, prefix);

            mg_http_reply(
                c, 200,
                "Content-Type: application/json\r\n",
                "{ \"infix\": \"%s\", \"postfix\": \"%s\", \"prefix\": \"%s\", \"evaluation\": \"Not applicable\" }",
                expr, postfix, prefix
            );
            return;
        }

        mg_http_serve_dir(c, hm, &(struct mg_http_serve_opts){
            .root_dir = "www"
        });
    }
}



int main(void) {
    struct mg_mgr mgr;
    mg_mgr_init(&mgr);

    mg_http_listen(&mgr, "http://0.0.0.0:8000", cb, NULL);
    printf("Server running at http://localhost:8000\n");

    for (;;) mg_mgr_poll(&mgr, 1000);

    mg_mgr_free(&mgr);
    return 0;
}
