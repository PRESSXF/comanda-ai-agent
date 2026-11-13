/**
 * Cardápio da Cantina Maré, um restaurante fictício do Recife.
 * Preços em centavos para evitar erros de ponto flutuante.
 */

export type Category = 'pratos' | 'petiscos' | 'bebidas' | 'sobremesas'

export interface MenuItem {
  id: string
  name: string
  category: Category
  priceCents: number
  description: string
  /** Alérgenos presentes no prato, em minúsculas. */
  allergens: string[]
  /** Nomes alternativos que clientes costumam usar. */
  aliases: string[]
  available: boolean
  vegetarian?: boolean
}

export const RESTAURANT = {
  name: 'Cantina Maré',
  city: 'Recife',
  hours: 'Terça a domingo, das 11h às 23h',
  minOrderCents: 3000,
} as const

export const MENU: MenuItem[] = [
  {
    id: 'baiao',
    name: 'Baião de dois',
    category: 'pratos',
    priceCents: 4290,
    description: 'Arroz, feijão-verde, queijo coalho, nata e charque desfiada. Serve 1.',
    allergens: ['lactose'],
    aliases: ['baiao', 'baião'],
    available: true,
  },
  {
    id: 'arrumadinho',
    name: 'Arrumadinho de charque',
    category: 'pratos',
    priceCents: 4690,
    description: 'Charque acebolada, feijão-verde, vinagrete, farofa e queijo coalho.',
    allergens: ['lactose', 'glúten'],
    aliases: ['arrumadinho'],
    available: true,
  },
  {
    id: 'escondidinho',
    name: 'Escondidinho de macaxeira',
    category: 'pratos',
    priceCents: 3990,
    description: 'Purê de macaxeira com carne de sol e gratinado de queijo.',
    allergens: ['lactose'],
    aliases: ['escondidinho', 'escondido'],
    available: true,
  },
  {
    id: 'moqueca',
    name: 'Moqueca de peixe',
    category: 'pratos',
    priceCents: 6890,
    description: 'Peixe do dia, leite de coco, dendê e pimentões. Acompanha arroz e pirão. Serve 2.',
    allergens: ['peixe'],
    aliases: ['moqueca', 'peixe'],
    available: false,
  },
  {
    id: 'cuscuz',
    name: 'Cuscuz recheado de legumes',
    category: 'pratos',
    priceCents: 3290,
    description: 'Cuscuz de milho com legumes salteados e queijo coalho.',
    allergens: ['lactose'],
    aliases: ['cuscuz'],
    available: true,
    vegetarian: true,
  },
  {
    id: 'caldinho',
    name: 'Caldinho de feijão',
    category: 'petiscos',
    priceCents: 1290,
    description: 'Com bacon crocante e cebolinha.',
    allergens: [],
    aliases: ['caldinho', 'caldo'],
    available: true,
  },
  {
    id: 'macaxeira-frita',
    name: 'Macaxeira frita',
    category: 'petiscos',
    priceCents: 2190,
    description: 'Porção para 2, com manteiga de garrafa.',
    allergens: ['lactose'],
    aliases: ['macaxeira', 'aipim', 'mandioca'],
    available: true,
    vegetarian: true,
  },
  {
    id: 'dadinho',
    name: 'Dadinho de tapioca',
    category: 'petiscos',
    priceCents: 2490,
    description: 'Com geleia de pimenta. 12 unidades.',
    allergens: ['lactose', 'amendoim'],
    aliases: ['dadinho', 'dadinhos'],
    available: true,
    vegetarian: true,
  },
  {
    id: 'suco-caja',
    name: 'Suco de cajá',
    category: 'bebidas',
    priceCents: 990,
    description: '500 ml, feito na hora.',
    allergens: [],
    aliases: ['caja', 'cajá', 'suco'],
    available: true,
    vegetarian: true,
  },
  {
    id: 'guarana',
    name: 'Guaraná lata',
    category: 'bebidas',
    priceCents: 690,
    description: '350 ml.',
    allergens: [],
    aliases: ['guarana', 'guaraná', 'refri', 'refrigerante'],
    available: true,
    vegetarian: true,
  },
  {
    id: 'agua',
    name: 'Água mineral',
    category: 'bebidas',
    priceCents: 450,
    description: '500 ml, com ou sem gás.',
    allergens: [],
    aliases: ['agua', 'água'],
    available: true,
    vegetarian: true,
  },
  {
    id: 'bolo-rolo',
    name: 'Bolo de rolo',
    category: 'sobremesas',
    priceCents: 1490,
    description: 'Fatia com goiabada, receita pernambucana.',
    allergens: ['glúten', 'lactose', 'ovo'],
    aliases: ['bolo de rolo', 'bolo'],
    available: true,
    vegetarian: true,
  },
  {
    id: 'cartola',
    name: 'Cartola',
    category: 'sobremesas',
    priceCents: 1890,
    description: 'Banana, queijo coalho, açúcar e canela.',
    allergens: ['lactose'],
    aliases: ['cartola'],
    available: true,
    vegetarian: true,
  },
]

export const CATEGORY_LABEL: Record<Category, string> = {
  pratos: 'Pratos',
  petiscos: 'Petiscos',
  bebidas: 'Bebidas',
  sobremesas: 'Sobremesas',
}

export function findItem(id: string): MenuItem | undefined {
  return MENU.find((m) => m.id === id)
}

export const formatBRL = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
