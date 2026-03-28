USE churrascaria_bot;

-- =========================
-- 📂 CATEGORIAS
-- =========================
INSERT IGNORE INTO categorias (id, nome) VALUES 
(1, 'Espetão 500g'),
(2, 'Espetão 1kg'),
(3, 'Espetinho Simples'),
(4, 'Espetinho Especial'),
(5, 'Jantinhas'),
(6, 'Saladas'),
(7, 'Caldos'),
(8, 'Porções'),
(9, 'Cervejas'),
(10, 'Long Neck'),
(11, 'Refrigerantes'),
(12, 'Bebidas'),
(13, 'Sucos');

-- =========================
-- 🧾 PRODUTOS (ID ÚNICO)
-- =========================
INSERT IGNORE INTO produtos (id, categoria_id, nome, descricao, preco) VALUES

-- ESPETÃO 500g (Acompanha: arroz, feijão tropeiro, vinagrete, mandioca e molho especial)
(1, 1, 'Picanha Black', 'Espetão 500g — a consultar', NULL),
(2, 1, 'Picanha', 'Espetão 500g com acompanhamentos', 99.00),
(3, 1, 'Contra Filé', 'Espetão 500g com acompanhamentos', 85.00),
(4, 1, 'Cupim', 'Espetão 500g com acompanhamentos', 99.00),
(5, 1, 'Lombo', 'Espetão 500g com acompanhamentos', 75.00),

-- ESPETÃO 1kg (Acompanha: arroz, feijão tropeiro, vinagrete, mandioca e molho especial)
(6, 2, 'Picanha', 'Espetão 1kg com acompanhamentos', 189.00),
(7, 2, 'Contra Filé', 'Espetão 1kg com acompanhamentos', 159.00),
(8, 2, 'Cupim', 'Espetão 1kg com acompanhamentos', 189.00),
(9, 2, 'Lombo', 'Espetão 1kg com acompanhamentos', 130.00),

-- ESPETINHO SIMPLES
(10, 3, 'Frango com bacon', '', 12.00),
(11, 3, 'Contra Filé', '', 14.00),
(12, 3, 'Queijo Coalho', '', 14.00),
(13, 3, 'Provolone', '', 14.00),
(14, 3, 'Coração', '', 12.00),
(15, 3, 'Linguiça sem pimenta', '', 12.00),
(16, 3, 'Linguiça com pimenta', '', 12.00),
(17, 3, 'Lombo suíno', '', 12.00),
(18, 3, 'Almôndega com bacon', '', 14.00),
(19, 3, 'Romeu e Julieta', '', 17.00),
(20, 3, 'Alcatra', '', 14.00),
(21, 3, 'Asinha de frango', '', 15.00),
(22, 3, 'Picanha 180g', '', 28.00),
(23, 3, 'Filé mignon', '', 17.00),
(24, 3, 'Cupim', '', 15.00),
(25, 3, 'Filé de frango', '', 12.00),

-- ESPETINHO ESPECIAL (Acompanha: vinagrete e mandioca)
(26, 4, 'Frango com bacon', 'Acompanha vinagrete e mandioca', 17.00),
(27, 4, 'Contra Filé', 'Acompanha vinagrete e mandioca', 19.00),
(28, 4, 'Queijo Coalho', 'Acompanha vinagrete e mandioca', 20.00),
(29, 4, 'Provolone', 'Acompanha vinagrete e mandioca', 21.00),
(30, 4, 'Coração', 'Acompanha vinagrete e mandioca', 17.00),
(31, 4, 'Linguiça sem pimenta', 'Acompanha vinagrete e mandioca', 17.00),
(32, 4, 'Linguiça com pimenta', 'Acompanha vinagrete e mandioca', 17.00),
(33, 4, 'Lombo suíno', 'Acompanha vinagrete e mandioca', 17.00),
(34, 4, 'Almôndega com bacon', 'Acompanha vinagrete e mandioca', 19.00),
(35, 4, 'Romeu e Julieta', 'Acompanha vinagrete e mandioca', 23.00),
(36, 4, 'Alcatra', 'Acompanha vinagrete e mandioca', 19.00),
(37, 4, 'Asinha de frango', 'Acompanha vinagrete e mandioca', 21.00),
(38, 4, 'Picanha 180g', 'Acompanha vinagrete e mandioca', 35.00),
(39, 4, 'Filé mignon', 'Acompanha vinagrete e mandioca', 25.00),
(40, 4, 'Cupim', 'Acompanha vinagrete e mandioca', 21.00),
(41, 4, 'Filé de frango', 'Acompanha vinagrete e mandioca', 17.00),

-- JANTINHA (Acompanha: arroz, feijão tropeiro, vinagrete, mandioca e molho especial)
(999, 5, '🍖 Completa com acompanhamentos:', 'Arroz, feijão tropeiro, vinagrete, mandioca e molho especial', 0.00),
(42, 5, 'Frango com bacon', '', 25.00),
(43, 5, 'Contra Filé', '', 26.00),
(44, 5, 'Queijo Coalho', '', 27.00),
(45, 5, 'Provolone', '', 29.00),
(46, 5, 'Coração', '', 25.00),
(47, 5, 'Linguiça sem pimenta', '', 25.00),
(48, 5, 'Linguiça com pimenta', '', 25.00),
(49, 5, 'Lombo suíno', '', 25.00),
(50, 5, 'Almôndega com bacon', '', 26.00),
(51, 5, 'Romeu e Julieta', '', 29.00),
(52, 5, 'Alcatra', '', 26.00),
(53, 5, 'Asinha de frango', '', 27.00),
(54, 5, 'Picanha 180g', '', 43.00),
(55, 5, 'Filé mignon', '', 31.00),
(56, 5, 'Cupim', '', 29.00),
(57, 5, 'Filé de frango', '', 25.00),

-- SALADAS
(58, 6, 'Salada Tropical', 'Alface, tomate cereja, maçã, palmito e manga', 40.00),
(59, 6, 'Salada Especial', 'Azeitona, palmito, cebola roxa, alface e tomate', 35.00),
(60, 6, 'Salada de Guariroba', '', 35.00),

-- CALDOS
(61, 7, 'Caldo de Feijão', '', 20.00),
(62, 7, 'Vaca atolada', '', 20.00),
(63, 7, 'Caldo de Frango', '', 20.00),

-- PORÇÕES
(64, 8, 'Picanha à palito 500g (completa)', 'Com arroz, feijão, cebola, mandioca e tomate', 99.00),
(65, 8, 'Picanha à palito 500g (simples)', 'Com cebola, mandioca e tomate', 85.00),
(66, 8, 'Frango a passarinho 1kg', 'Com arroz, feijão tropeiro, tomate e mandioca', 60.00),
(67, 8, 'Isca de peixe tilápia 500g', 'Com arroz e vinagrete', 70.00),
(68, 8, 'Frango a passarinho', 'Porção', 49.00),
(69, 8, 'Isca de peixe tilápia', 'Porção', 60.00),
(70, 8, 'Meia isca de peixe', '', 40.00),
(71, 8, 'Batata frita', '', 25.00),
(72, 8, 'Batata especial', '', 35.00),
(73, 8, 'Kibe com queijo', '', 25.00),
(74, 8, 'Bolinha de queijo', '', 30.00),
(75, 8, 'Bolinha de bacalhau', '', 45.00),
(76, 8, 'Bolinho de arroz', '', 25.00),
(77, 8, 'Torresmo com mandioca 500g', '', 30.00),
(78, 8, 'Ceviche', '', 30.00),
(79, 8, 'Meio ceviche', '', 20.00),
(80, 8, 'Ceviche de guariroba', '', 30.00),
(81, 8, 'Arroz (extra)', '', 9.00),
(82, 8, 'Feijão (extra)', '', 9.00),
(83, 8, 'Vinagrete (extra)', '', 6.00),
(84, 8, 'Mandioca (extra)', '', 9.00),
(85, 8, 'Mandioca frita (extra)', '', 10.00),

-- CERVEJAS
(86, 9, 'Antarctica', 'Lata', 11.00),
(87, 9, 'Skol', 'Lata', 11.00),
(88, 9, 'Brahma Duplo Malte', 'Lata', 11.00),
(89, 9, 'Brahma', 'Lata', 11.00),
(90, 9, 'Original', 'Garrafa', 13.00),
(91, 9, 'Budweiser', 'Lata', 14.00),
(92, 9, 'Amstel', 'Lata', 14.00),
(93, 9, 'Heineken', 'Lata', 17.00),

-- LONG NECK
(94, 10, 'Brahma Zero', 'Long Neck', 10.00),
(95, 10, 'Heineken Zero', 'Long Neck', 12.00),
(96, 10, 'Heineken', 'Long Neck', 12.00),
(97, 10, 'Heineken 250ml', 'Long Neck', 10.00),
(98, 10, 'Michelob', 'Long Neck', 10.00),
(99, 10, 'Brahma Malzbier', 'Long Neck', 12.00),
(100, 10, 'Corona', 'Long Neck', 12.00),
(101, 10, 'Spaten', 'Long Neck', 8.00),

-- REFRIGERANTES
(102, 11, 'Coca-Cola Zero LT', '', 8.00),
(103, 11, 'Coca-Cola LT/KS', '', 8.00),
(104, 11, 'Coca-Cola 600ml', '', 10.00),
(105, 11, 'Coca-Cola 600ml Zero', '', 11.00),
(106, 11, 'Coca-Cola 1L', '', 12.00),
(107, 11, 'Coca-Cola 1L Zero', '', 14.00),
(108, 11, 'Coca-Cola 2L', '', 15.00),
(109, 11, 'Coca-Cola 2L Zero', '', 17.00),
(110, 11, 'Guaraná lata/KS', '', 8.00),
(111, 11, 'Guaraná Zero LT', '', 8.00),
(112, 11, 'Guaraná 1L', '', 12.00),
(113, 11, 'Guaraná 2L Zero', '', 15.00),
(114, 11, 'Água tônica', '', 8.00),
(115, 11, 'Água tônica Zero', '', 8.00),
(116, 11, 'Soda', '', 8.00),
(117, 11, 'Fanta', '', 8.00),

-- BEBIDAS
(118, 12, 'H2O', '', 9.00),
(119, 12, 'Smirnoff Ice', '', 14.00),
(120, 12, 'Caipirinha', '', 12.00),
(121, 12, 'Caipirosca', '', 15.00),
(122, 12, 'Preparo Cozumel', '', 8.00),
(123, 12, 'Água sem gás', '', 5.00),
(124, 12, 'Água com gás', '', 6.00),
(125, 12, 'Energético Extra Power', '', 12.00),
(126, 12, 'Red Bull', '', 16.00),

-- SUCOS
(127, 13, 'Jarra de suco', 'Frutas: laranja, morango, limão / Polpas disponíveis', 17.00),
(128, 13, 'Copo de creme', '', 15.00),
(129, 13, 'Suco no copo', 'Frutas: laranja, morango, limão / Polpas disponíveis', 9.00),
(130, 13, 'Polpa adicional', '', 5.00);

