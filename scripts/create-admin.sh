#!/bin/bash
# Cria (ou atualiza a senha de) um usuário do painel admin.
# Uso, na VPS:  ./scripts/create-admin.sh
set -e
cd "$(dirname "$0")/.."

read -r -p "Nome: " A_NAME
read -r -p "E-mail (login): " A_EMAIL
read -r -s -p "Senha (mín. 10 caracteres, não aparece na tela): " A_PASS
echo

if [ "${#A_PASS}" -lt 10 ]; then
    echo "A senha precisa ter pelo menos 10 caracteres." >&2
    exit 1
fi

# A senha vai por variável de ambiente (não aparece no histórico do shell
# nem precisa de aspas). O model User já aplica o hash (bcrypt) sozinho.
docker compose exec -T \
    -e A_NAME="$A_NAME" -e A_EMAIL="$A_EMAIL" -e A_PASS="$A_PASS" \
    app php artisan tinker --execute='
        \App\Models\User::updateOrCreate(
            ["email" => getenv("A_EMAIL")],
            ["name" => getenv("A_NAME"), "password" => getenv("A_PASS")]
        );
        echo "Usuário salvo com sucesso.\n";
    '
