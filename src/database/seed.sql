USE churrascaria_bot;

-- Inserindo categorias
INSERT IGNORE INTO categorias (id, nome) VALUES 
(1, 'Carnes'), 
(2, 'Bebidas'), 
(3, 'Acompanhamentos'), 
(4, 'Sobremesas');

-- Inserindo produtos
INSERT IGNORE INTO produtos (id, categoria_id, nome, descricao, preco) VALUES
(1, 1, 'Picanha', 'Picanha na brasa (500g)', 89.90),
(2, 1, 'Maminha', 'Maminha na brasa (500g)', 69.90),
(3, 1, 'Costela', 'Costela assada lentamente (500g)', 59.90),
(4, 1, 'Linguiça Toscana', 'Porção de linguiça (400g)', 35.00),
(5, 1, 'Coração de Frango', 'Porção de coração no espeto (300g)', 28.00),

(6, 2, 'Coca-Cola 2L', 'Refrigerante garrafa 2 litros', 14.00),
(7, 2, 'Coca-Cola Lata', 'Refrigerante lata 350ml', 6.00),
(8, 2, 'Guaraná Antarctica 2L', 'Refrigerante garrafa 2 litros', 12.00),
(9, 2, 'Cerveja Heineken', 'Garrafa 600ml', 16.00),
(10, 2, 'Suco de Laranja', 'Jarra 1 litro (Natural)', 18.00),

(11, 3, 'Arroz Branco', 'Porção de arroz', 15.00),
(12, 3, 'Farofa Especial', 'Farofa com bacon e calabresa', 18.00),
(13, 3, 'Maionese', 'Salada de maionese tradicional', 20.00),
(14, 3, 'Batata Frita', 'Porção grande de batata', 25.00),
(15, 3, 'Pão de Alho', 'Porção com 4 unidades', 16.00),

(16, 4, 'Pudim', 'Fatia de pudim de leite condensado', 12.00),
(17, 4, 'Mousse de Maracujá', 'Taça individual', 10.00),
(18, 4, 'Petit Gateau', 'Com sorvete de creme', 22.00);
