<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Separa o endereço de entrega. Pedidos antigos ficam com a rua igual
     * ao texto que já existia, número S/N e bairro "Não informado".
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('delivery_street', 180)->nullable()->after('change_for');
            $table->string('delivery_number', 10)->nullable()->after('delivery_street');
            $table->string('delivery_neighborhood', 60)->nullable()->after('delivery_number');
            $table->string('delivery_reference', 80)->nullable()->after('delivery_neighborhood');
        });

        DB::table('orders')
            ->whereNotNull('delivery_address')
            ->whereRaw("TRIM(delivery_address) <> ''")
            ->update([
                'delivery_street' => DB::raw('LEFT(TRIM(delivery_address), 180)'),
                'delivery_number' => 'S/N',
                'delivery_neighborhood' => 'Não informado',
            ]);

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('delivery_address');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->text('delivery_address')->nullable()->after('change_for');
        });

        DB::statement("
            UPDATE orders
            SET delivery_address = CONCAT(
                delivery_street,
                ', ',
                IFNULL(delivery_number, 'S/N'),
                ' - ',
                IFNULL(delivery_neighborhood, ''),
                IF(
                    delivery_reference IS NULL OR delivery_reference = '',
                    '',
                    CONCAT(' (Ref: ', delivery_reference, ')')
                )
            )
            WHERE delivery_street IS NOT NULL AND TRIM(delivery_street) <> ''
        ");

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'delivery_street',
                'delivery_number',
                'delivery_neighborhood',
                'delivery_reference',
            ]);
        });
    }
};
