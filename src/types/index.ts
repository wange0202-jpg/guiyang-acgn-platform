export interface User {
  id: string
  username: string
  avatar?: string
  role: 'user' | 'admin'
  createdAt: string
}

export interface Convention {
  id: string
  title: string
  startDate: string
  endDate: string
  location: string
  organizer: string
  description: string
  images: string[]
  createdAt: string
  creatorId?: string  // 创建者用户ID
  creatorUsername: string // 创建者用户名
  isHot?: boolean // 是否为热门漫展
}

export interface CosWork {
  id: string
  title: string
  category: 'cos' | 'hanfu' | 'lolita' | 'jk' | 'kigurumi'
  images: string[]
  description: string
  author: User
  likes: number
  createdAt: string
}

export interface Service {
  id: string
  title: string
  category: 'makeup' | 'wig' | 'photographer' | 'props'
  nickname: string
  avatar?: string
  contact: string
  description: string
  priceRange: string
  works: string[]
  rating: number
  reviewCount: number
  createdAt: string
}

export interface Product {
  id: string
  title: string
  category: 'costume' | 'wig' | 'props' | 'merchandise'
  price: number
  condition: '全新' | '几乎全新' | '轻微使用痕迹' | '有明显使用痕迹'
  images: string[]
  description: string
  seller: User
  shipping: string
  createdAt: string
}

export type ConventionCategory = 'guiyang'

export type CosCategory = 'cos' | 'hanfu' | 'lolita' | 'jk' | 'kigurumi' | 'teamBuilding'

export type ServiceCategory = 'makeup' | 'wig' | 'photographer' | 'props'

export type ProductCategory = 'costume' | 'wig' | 'props' | 'merchandise'

export const conventionCategories = {
  guiyang: '贵阳',
} as const

export const cosCategories = {
  cos: 'COS',
  hanfu: '汉服',
  lolita: '洛丽塔',
  jk: 'JK制服',
  kigurumi: '皮套/兽装',
  teamBuilding: '团建招募',
} as const

export const serviceCategories = {
  makeup: '妆娘',
  wig: '毛娘',
  photographer: '摄影师',
  props: '道具师',
} as const

export const productCategories = {
  costume: 'C服/cosplay服装',
  wig: '假发',
  props: '道具',
  merchandise: '周边/其他',
} as const
