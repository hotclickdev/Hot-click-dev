import type { ProductoEmprendedor } from '../types'

const DESC_AURICULARES =
  'Auriculares inalámbricos con cancelación de ruido, batería de larga duración y estuche de carga incluido. Ideal para uso diario.'

/**
 * Catálogo del mock Figma (Paso 2 / 5 / 8).
 */
export const PRODUCTOS_DEMO: ProductoEmprendedor[] = [
  {
    id: 'x200',
    nombre: 'Auriculares Bluetooth X200',
    categoria: 'Tecnología',
    precio: 18500,
    precioCompra: 11000,
    estado: 'Publicado',
    stock: 8,
    recienAgregado: true,
    descripcion: DESC_AURICULARES,
  },
  {
    id: 'oversize',
    nombre: 'Camiseta Oversize Negra',
    categoria: 'Ropa',
    precio: 9900,
    precioCompra: 4200,
    estado: 'Publicado',
    stock: 14,
    recienAgregado: true,
    descripcion: 'Camiseta oversize de algodón, corte amplio.',
  },
  {
    id: 'usb-c',
    nombre: 'Cargador USB-C 30W',
    categoria: 'Tecnología',
    precio: 7200,
    precioCompra: 3100,
    estado: 'Publicado',
    stock: 3,
    recienAgregado: true,
    descripcion: 'Cargador rápido USB-C 30W.',
  },
  {
    id: 'mouse',
    nombre: 'Mouse Inalámbrico Pro',
    categoria: 'Tecnología',
    precio: 12400,
    precioCompra: 5600,
    estado: 'Publicado',
    stock: 9,
    recienAgregado: false,
    descripcion: 'Mouse inalámbrico ergonómico.',
  },
  {
    id: 'funda',
    nombre: 'Funda para Celular',
    categoria: 'Tecnología',
    precio: 4800,
    precioCompra: 1800,
    estado: 'Pausado',
    stock: 20,
    recienAgregado: false,
    descripcion: 'Funda protectora para celular.',
  },
  {
    id: 'jean',
    nombre: 'Jean Slim Fit Azul',
    categoria: 'Ropa',
    precio: 21000,
    precioCompra: 9000,
    estado: 'Publicado',
    stock: 6,
    recienAgregado: false,
    descripcion: 'Jean slim fit azul.',
  },
  {
    id: 'buzo',
    nombre: 'Buzo Canguro Gris',
    categoria: 'Ropa',
    precio: 15500,
    precioCompra: 7000,
    estado: 'Pausado',
    stock: 5,
    recienAgregado: false,
    descripcion: 'Buzo canguro gris con capucha.',
  },
]
