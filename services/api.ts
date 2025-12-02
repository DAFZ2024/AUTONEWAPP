import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// URL del backend en producción (Render)
// IMPORTANTE: Esta URL debe coincidir con tu backend desplegado
const PRODUCTION_API_URL = 'https://autonewapp-backend.onrender.com/api';

// Obtener URL de forma segura - prioriza la config, pero usa producción como fallback
const getApiUrl = (): string => {
  try {
    const configUrl = Constants.expoConfig?.extra?.apiUrl;
    if (configUrl && typeof configUrl === 'string' && configUrl.startsWith('http')) {
      return configUrl;
    }
  } catch (e) {
    console.log('Error obteniendo config, usando URL de producción');
  }
  return PRODUCTION_API_URL;
};

const API_URL = getApiUrl();
const API_BASE_URL = API_URL.replace('/api', '');

// Log para debug (puedes quitar en producción)
console.log('[API] URL configurada:', API_URL);

// Tipos de respuesta
export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
}

export interface User {
    id: number;
    nombre_completo: string;
    nombre_usuario: string;
    correo: string;
    telefono?: string;
    direccion?: string;
    rol: 'cliente' | 'admin';
    fecha_registro: string;
    profile_picture?: string | null;
}

export interface LoginResponse {
    user: User;
    token: string;
}

export interface RegisterData {
    nombre_completo: string;
    nombre_usuario: string;
    correo: string;
    password: string;
    telefono?: string;
    direccion?: string;
}

export interface LoginData {
    correo: string;
    password: string;
}

// Función para guardar el token
export const saveToken = async (token: string): Promise<void> => {
    try {
        await AsyncStorage.setItem('token', token);
    } catch (error) {
        console.error('Error al guardar token:', error);
    }
};

// Función para obtener el token
export const getToken = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem('token');
    } catch (error) {
        console.error('Error al obtener token:', error);
        return null;
    }
};

// Función para eliminar el token
export const removeToken = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem('token');
    } catch (error) {
        console.error('Error al eliminar token:', error);
    }
};

// Función para guardar datos del usuario
export const saveUser = async (user: User): Promise<void> => {
    try {
        await AsyncStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
        console.error('Error al guardar usuario:', error);
    }
};

// Función para obtener datos del usuario
export const getUser = async (): Promise<User | null> => {
    try {
        const userData = await AsyncStorage.getItem('user');
        console.log('[API] getUser raw data:', userData);
        return userData ? JSON.parse(userData) : null;
    } catch (error) {
        console.error('Error al obtener usuario:', error);
        return null;
    }
};

// Función para eliminar datos del usuario
export const removeUser = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem('user');
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
    }
};

// Función helper para hacer peticiones
const fetchApi = async <T = any>(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> => {
    try {
        const token = await getToken();

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...options.headers as Record<string, string>,
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const url = `${API_URL}${endpoint}`;
        console.log(`[API] Fetching: ${url}`);

        const response = await fetch(url, {
            ...options,
            headers,
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: data.message || 'Error en la petición',
                error: data.error,
            };
        }

        return data;
    } catch (error) {
        console.error('Error en fetchApi:', error);
        return {
            success: false,
            message: 'Error de conexión con el servidor',
            error: error instanceof Error ? error.message : 'Error desconocido',
        };
    }
};

// ==================== AUTENTICACIÓN ====================

/**
 * Registrar un nuevo usuario
 */
export const register = async (data: RegisterData): Promise<ApiResponse<LoginResponse>> => {
    const response = await fetchApi<LoginResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
    });

    if (response.success && response.data) {
        await saveToken(response.data.token);
        await saveUser(response.data.user);
    }

    return response;
};

/**
 * Iniciar sesión
 */
export const login = async (data: LoginData): Promise<ApiResponse<LoginResponse>> => {
    const response = await fetchApi<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
    });

    if (response.success && response.data) {
        await saveToken(response.data.token);
        await saveUser(response.data.user);
    }

    return response;
};

/**
 * Cerrar sesión
 */
export const logout = async (): Promise<void> => {
    await removeToken();
    await removeUser();
};

/**
 * Obtener perfil del usuario autenticado
 */
export const getProfile = async (): Promise<ApiResponse<User>> => {
    return fetchApi<User>('/auth/profile');
};

/**
 * Actualizar perfil del usuario
 */
export const updateProfile = async (data: Partial<User>): Promise<ApiResponse<User>> => {
    const response = await fetchApi<User>('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
    });

    if (response.success && response.data) {
        await saveUser(response.data);
    }

    return response;
};

/**
 * Cambiar contraseña del usuario
 */
export const changePassword = async (currentPassword: string, newPassword: string): Promise<ApiResponse> => {
    return fetchApi('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
    });
};

/**
 * Verificar si el usuario está autenticado
 */
export const isAuthenticated = async (): Promise<boolean> => {
    const token = await getToken();
    return token !== null;
};

// ==================== HEALTH CHECK ====================

/**
 * Verificar estado del servidor
 */
export const healthCheck = async (): Promise<ApiResponse> => {
    return fetchApi('/health');
};

// ==================== RESERVAS ====================

export interface Reserva {
    id_reserva: number;
    fecha: string;
    hora: string;
    // Estados según modelo Django: pendiente, completado, cancelada
    // También incluimos estados adicionales del backend Node: confirmada, en_proceso, completada
    estado: 'pendiente' | 'confirmada' | 'completada' | 'completado' | 'cancelada' | 'en_proceso';
    empresa_id: number;
    usuario_id: number;
    nombre_empresa: string;
    direccion_empresa: string;
    total: number;
    servicios: any[];
}

export interface Servicio {
    id_servicio: number;
    nombre_servicio: string;
    descripcion: string;
    precio: number;
    categoria?: string;
    tipos_vehiculo?: string[];
}

export interface ServicioPlan {
    id_servicio: number;
    nombre_servicio: string;
    descripcion: string;
    precio_original: number;
    porcentaje_descuento: number;
    precio_con_descuento: number;
}

export interface Suscripcion {
    id: number;
    estado: string;
    fechaInicio: string;
    fechaFin: string;
    serviciosUtilizadosMes: number;
    plan: {
        id: number;
        nombre: string;
        tipo: string;
        descripcion: string;
        precioMensual: number;
        cantidadServiciosMes: number;
    };
}

export interface VerificarSuscripcionResponse {
    tieneSuscripcion: boolean;
    suscripcion: Suscripcion | null;
    serviciosPlan: ServicioPlan[];
    serviciosDisponibles: number; // -1 = ilimitado
}

export interface Empresa {
    id_empresa: number;
    nombre_empresa: string;
    direccion: string;
    telefono: string;
    latitud?: number;
    longitud?: number;
}

/**
 * Verificar suscripción activa del usuario
 */
export const verificarSuscripcion = async (): Promise<ApiResponse<VerificarSuscripcionResponse>> => {
    return fetchApi<VerificarSuscripcionResponse>('/reservas/verificar-suscripcion');
};

/**
 * Obtener todos los servicios disponibles
 */
export const getServicios = async (): Promise<ApiResponse<{ servicios: Servicio[] }>> => {
    return fetchApi<{ servicios: Servicio[] }>('/reservas/servicios');
};

/**
 * Obtener empresas que ofrecen los servicios seleccionados
 */
export const getEmpresasPorServicios = async (serviciosIds: number[]): Promise<ApiResponse<{ empresas: Empresa[] }>> => {
    const serviciosStr = serviciosIds.join(',');
    return fetchApi<{ empresas: Empresa[] }>(`/reservas/empresas-por-servicios?servicios=${serviciosStr}`);
};

/**
 * Obtener horarios disponibles para una fecha y empresa
 */
export const getHorariosDisponibles = async (empresaId: number, fecha: string): Promise<ApiResponse<{ horariosDisponibles: string[] }>> => {
    return fetchApi<{ horariosDisponibles: string[] }>(`/reservas/horarios-disponibles?empresaId=${empresaId}&fecha=${fecha}`);
};

/**
 * Crear una nueva reserva
 */
export interface CrearReservaData {
    fecha: string;
    hora: string;
    empresa_id: number;
    servicios: Array<{
        id_servicio: number;
        es_servicio_plan: boolean;
        descuento: number;
    }>;
    placa_vehiculo?: string;
    tipo_vehiculo?: string;
    conductor_asignado?: string;
    observaciones_empresariales?: string;
    es_pago_individual?: boolean;
    es_reserva_empresarial?: boolean;
    usar_suscripcion?: boolean;
    suscripcion_id?: number;
}

export const crearReserva = async (data: CrearReservaData): Promise<ApiResponse<{ reserva: any }>> => {
    return fetchApi<{ reserva: any }>('/reservas/crear', {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

/**
 * Obtener reservas de un usuario
 */
export const getReservasUsuario = async (usuarioId: number): Promise<ApiResponse<{ reservas: Reserva[] }>> => {
    return fetchApi<{ reservas: Reserva[] }>(`/reservas/usuario/${usuarioId}`);
};

/**
 * Cancelar una reserva
 */
export const cancelarReserva = async (reservaId: number, usuarioId: number): Promise<ApiResponse> => {
    return fetchApi(`/reservas/cancelar/${reservaId}`, {
        method: 'PUT',
        body: JSON.stringify({ usuario_id: usuarioId }),
    });
};

// ==================== EMPRESA ====================

export interface Empresa {
    id_empresa: number;
    nombre_empresa: string;
    direccion: string;
    telefono: string;
    email: string;
    verificada: boolean;
    latitud?: number;
    longitud?: number;
    profile_image?: string;
}

export interface EmpresaLoginData {
    email: string;
    password: string;
}

export interface EmpresaLoginResponse {
    empresa: Empresa;
    token: string;
}

export interface DashboardStats {
    citasHoy: number;
    ingresosHoy: number;
    clientesActivos: number;
    satisfaccion: number;
    citasPendientes: number;
    ingresosMes: number;
    reservasMes: number;
    proximasCitas: any[];
}

export interface ReservaEmpresa {
    id_reserva: number;
    numero_reserva: string;
    fecha: string;
    hora: string;
    estado: string;
    placa_vehiculo: string;
    tipo_vehiculo: string;
    conductor_asignado: string;
    observaciones_empresariales: string;
    pagado_empresa: boolean;
    nombre_cliente: string;
    email_cliente: string;
    telefono_cliente: string;
    servicios: any[];
    total: number;
}

export interface Analiticas {
    // Estadísticas principales
    totalReservas: number;
    completadas: number;
    canceladas: number;
    pendientes: number;
    ingresosTotales: number;
    tasaExito: number;
    tasaCancelacion: number;
    // Datos para gráficos
    ingresosMensuales: Array<{ mes: string; mes_numero: number; ingresos: number }>;
    reservasDiarias: Array<{ fecha: string; dia_semana: string; cantidad: number }>;
    ingresosPorDia: Array<{ fecha: string; ingresos: number; cantidad_reservas: number }>;
    serviciosPopulares: Array<{ nombre_servicio: string; cantidad: number; ingresos_total: number }>;
    horasPopulares: Array<{ hora: number; cantidad: number }>;
    resumenEstados: Array<{ estado: string; cantidad: number }>;
    clientesFrecuentes: Array<{ nombre_completo: string; correo: string; total_reservas: number; total_gastado: number }>;
}

// Guardar datos de empresa en AsyncStorage
export const saveEmpresa = async (empresa: Empresa): Promise<void> => {
    try {
        await AsyncStorage.setItem('empresa', JSON.stringify(empresa));
    } catch (error) {
        console.error('Error al guardar empresa:', error);
    }
};

// Obtener datos de empresa
export const getEmpresa = async (): Promise<Empresa | null> => {
    try {
        const empresaData = await AsyncStorage.getItem('empresa');
        return empresaData ? JSON.parse(empresaData) : null;
    } catch (error) {
        console.error('Error al obtener empresa:', error);
        return null;
    }
};

// Eliminar datos de empresa
export const removeEmpresa = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem('empresa');
    } catch (error) {
        console.error('Error al eliminar empresa:', error);
    }
};

/**
 * Iniciar sesión como empresa
 */
export const loginEmpresa = async (data: EmpresaLoginData): Promise<ApiResponse<EmpresaLoginResponse>> => {
    const response = await fetchApi<EmpresaLoginResponse>('/empresa/login', {
        method: 'POST',
        body: JSON.stringify(data),
    });

    if (response.success && response.data) {
        await saveToken(response.data.token);
        await saveEmpresa(response.data.empresa);
    }

    return response;
};

/**
 * Cerrar sesión de empresa
 */
export const logoutEmpresa = async (): Promise<void> => {
    await removeToken();
    await removeEmpresa();
};

/**
 * Obtener estadísticas del dashboard de empresa
 */
export const getDashboardStats = async (): Promise<ApiResponse<DashboardStats>> => {
    return fetchApi<DashboardStats>('/empresa/dashboard');
};

/**
 * Obtener reservas de la empresa
 */
export const getReservasEmpresa = async (params?: { estado?: string; fecha?: string; pagina?: number; limite?: number }): Promise<ApiResponse<{ reservas: ReservaEmpresa[]; paginacion: any }>> => {
    const queryParams = new URLSearchParams();
    if (params?.estado) queryParams.append('estado', params.estado);
    if (params?.fecha) queryParams.append('fecha', params.fecha);
    if (params?.pagina) queryParams.append('pagina', params.pagina.toString());
    if (params?.limite) queryParams.append('limite', params.limite.toString());
    
    const queryString = queryParams.toString();
    return fetchApi<{ reservas: ReservaEmpresa[]; paginacion: any }>(`/empresa/reservas${queryString ? `?${queryString}` : ''}`);
};

/**
 * Actualizar estado de una reserva
 */
export const actualizarEstadoReserva = async (reservaId: number, estado: string): Promise<ApiResponse> => {
    return fetchApi(`/empresa/reservas/${reservaId}/estado`, {
        method: 'PUT',
        body: JSON.stringify({ estado }),
    });
};

/**
 * Obtener servicios de la empresa
 */
export const getServiciosEmpresa = async (): Promise<ApiResponse<{ servicios: Servicio[] }>> => {
    return fetchApi<{ servicios: Servicio[] }>('/empresa/servicios');
};

/**
 * Obtener analíticas de la empresa
 */
export const getAnaliticas = async (periodo?: string): Promise<ApiResponse<Analiticas>> => {
    const queryString = periodo ? `?periodo=${periodo}` : '';
    return fetchApi<Analiticas>(`/empresa/analiticas${queryString}`);
};

/**
 * Obtener perfil de la empresa
 */
export const getEmpresaProfile = async (): Promise<ApiResponse<Empresa & { servicios: Servicio[] }>> => {
    return fetchApi<Empresa & { servicios: Servicio[] }>('/empresa/profile');
};

// ==================== SERVICIOS DE EMPRESA ====================

export interface ServicioAsignado {
    id_servicio: number;
    nombre_servicio: string;
    descripcion: string;
    precio: number;
    total_reservas: number;
    ingresos_generados: number;
}

export interface ServicioDisponible {
    id_servicio: number;
    nombre_servicio: string;
    descripcion: string;
    precio: number;
}

export interface SolicitudServicio {
    id_solicitud: number;
    estado: 'pendiente' | 'aprobada' | 'rechazada' | 'en_revision';
    fecha_solicitud: string;
    motivo_solicitud: string;
    respuesta_admin: string;
    fecha_respuesta: string | null;
    id_servicio: number;
    nombre_servicio: string;
    descripcion: string;
    precio: number;
}

export interface ServiciosCompletosResponse {
    serviciosAsignados: ServicioAsignado[];
    serviciosDisponibles: ServicioDisponible[];
    solicitudesPendientes: SolicitudServicio[];
}

export interface SolicitarServicioData {
    servicioId: number;
    motivo: string;
    usuarioResponsable: string;
    telefonoContacto: string;
}

/**
 * Obtener servicios asignados y disponibles para la empresa
 */
export const getServiciosCompletos = async (): Promise<ApiResponse<ServiciosCompletosResponse>> => {
    return fetchApi<ServiciosCompletosResponse>('/empresa/servicios-completos');
};

/**
 * Solicitar un nuevo servicio
 */
export const solicitarServicio = async (data: SolicitarServicioData): Promise<ApiResponse<any>> => {
    return fetchApi('/empresa/servicios/solicitar', {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

/**
 * Cancelar solicitud de servicio
 */
export const cancelarSolicitudServicio = async (solicitudId: number): Promise<ApiResponse> => {
    return fetchApi(`/empresa/servicios/solicitud/${solicitudId}`, {
        method: 'DELETE',
    });
};

/**
 * Obtener datos de una reserva para generar código QR (empresa)
 */
export interface QRData {
    qrData: string;
    numero_reserva: string;
    reserva: {
        id_reserva: number;
        numero_reserva: string;
        fecha: string;
        hora: string;
        estado: string;
        nombre_cliente: string;
        nombre_empresa: string;
    };
}

export const getReservaParaQR = async (reservaId: number): Promise<ApiResponse<QRData>> => {
    return fetchApi<QRData>(`/empresa/reservas/${reservaId}/qr`);
};

/**
 * Verificar y completar reserva mediante código QR (cliente)
 */
export interface VerificarQRData {
    numero_reserva?: string;
    id_reserva?: number;
}

export interface VerificarQRResponse {
    id_reserva: number;
    numero_reserva: string;
    empresa: string;
    cliente: string;
    fecha: string;
    hora: string;
    estado: string;
}

export const verificarYCompletarReservaQR = async (data: VerificarQRData): Promise<ApiResponse<VerificarQRResponse>> => {
    return fetchApi<VerificarQRResponse>('/reservas/verificar-qr', {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

/**
 * Obtener reserva por número de reserva (cliente)
 */
export const getReservaPorNumero = async (numeroReserva: string): Promise<ApiResponse<Reserva>> => {
    return fetchApi<Reserva>(`/reservas/por-numero/${numeroReserva}`);
};

// ==================== PERFIL DE EMPRESA ====================

export interface PerfilEmpresa {
    id_empresa: number;
    nombre_empresa: string;
    direccion: string;
    telefono: string;
    email: string;
    fecha_registro: string;
    verificada: boolean;
    latitud: number | null;
    longitud: number | null;
    profile_image: string | null;
    // Información bancaria
    titular_cuenta: string | null;
    tipo_documento_titular: string | null;
    numero_documento_titular: string | null;
    banco: string | null;
    tipo_cuenta: string | null;
    numero_cuenta: string | null;
    swift_code: string | null;
    iban: string | null;
    // Información fiscal
    nit_empresa: string | null;
    razon_social: string | null;
    regimen_tributario: string | null;
    // Contacto facturación
    email_facturacion: string | null;
    telefono_facturacion: string | null;
    responsable_pagos: string | null;
    // Estado de verificación
    datos_bancarios_verificados: boolean;
    fecha_verificacion_bancaria: string | null;
    notas_bancarias: string | null;
    is_active: boolean;
    // Estadísticas
    estadisticas: {
        totalReservas: number;
        reservasCompletadas: number;
        ingresosTotales: number;
    };
}

export interface ActualizarPerfilBasicoData {
    nombre_empresa: string;
    direccion: string;
    telefono: string;
    email: string;
    latitud?: number | null;
    longitud?: number | null;
}

export interface ActualizarInfoBancariaData {
    titular_cuenta?: string;
    tipo_documento_titular?: string;
    numero_documento_titular?: string;
    banco?: string;
    tipo_cuenta?: string;
    numero_cuenta?: string;
    swift_code?: string;
    iban?: string;
    nit_empresa?: string;
    razon_social?: string;
    regimen_tributario?: string;
    email_facturacion?: string;
    telefono_facturacion?: string;
    responsable_pagos?: string;
    notas_bancarias?: string;
}

export interface CambiarContrasenaData {
    contrasena_actual: string;
    nueva_contrasena: string;
}

/**
 * Obtener perfil completo de la empresa
 */
export const getPerfilEmpresa = async (): Promise<ApiResponse<PerfilEmpresa>> => {
    return fetchApi<PerfilEmpresa>('/empresa/perfil');
};

/**
 * Actualizar información básica del perfil
 */
export const actualizarPerfilBasico = async (data: ActualizarPerfilBasicoData): Promise<ApiResponse<any>> => {
    return fetchApi('/empresa/perfil/basico', {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};

/**
 * Actualizar información bancaria
 */
export const actualizarInfoBancaria = async (data: ActualizarInfoBancariaData): Promise<ApiResponse<any>> => {
    return fetchApi('/empresa/perfil/bancario', {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};

/**
 * Cambiar contraseña de la empresa
 */
export const cambiarContrasenaEmpresa = async (data: CambiarContrasenaData): Promise<ApiResponse<any>> => {
    return fetchApi('/empresa/perfil/contrasena', {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};

/**
 * Actualizar foto de perfil de la empresa
 */
export const actualizarFotoPerfil = async (imageUri: string): Promise<ApiResponse<{ profile_image: string }>> => {
    const token = await AsyncStorage.getItem('empresaToken');
    
    const formData = new FormData();
    
    // Obtener el nombre del archivo y el tipo
    const uriParts = imageUri.split('/');
    const fileName = uriParts[uriParts.length - 1];
    const fileType = fileName.split('.').pop()?.toLowerCase() || 'jpg';
    
    formData.append('profile_image', {
        uri: imageUri,
        name: fileName,
        type: `image/${fileType}`,
    } as any);

    try {
        const response = await fetch(`${API_BASE_URL}/empresa/perfil/foto`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error al actualizar foto de perfil:', error);
        return {
            success: false,
            message: 'Error de conexión al actualizar foto',
        };
    }
};

/**
 * Eliminar foto de perfil de la empresa
 */
export const eliminarFotoPerfil = async (): Promise<ApiResponse<any>> => {
    return fetchApi('/empresa/perfil/foto', {
        method: 'DELETE',
    });
};

// ==================== FOTO DE PERFIL DE CLIENTE ====================

/**
 * Actualizar foto de perfil del cliente/usuario
 */
export const actualizarFotoPerfilUsuario = async (imageUri: string): Promise<ApiResponse<{ profile_picture: string }>> => {
    const token = await AsyncStorage.getItem('userToken');
    
    const formData = new FormData();
    
    // Obtener el nombre del archivo y el tipo
    const uriParts = imageUri.split('/');
    const fileName = uriParts[uriParts.length - 1];
    const fileType = fileName.split('.').pop()?.toLowerCase() || 'jpg';
    
    formData.append('imagen', {
        uri: imageUri,
        name: fileName,
        type: `image/${fileType}`,
    } as any);

    try {
        const response = await fetch(`${API_BASE_URL}/auth/profile/foto`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error al actualizar foto de perfil:', error);
        return {
            success: false,
            message: 'Error de conexión al actualizar foto',
        };
    }
};

/**
 * Eliminar foto de perfil del cliente/usuario
 */
export const eliminarFotoPerfilUsuario = async (): Promise<ApiResponse<any>> => {
    const token = await AsyncStorage.getItem('userToken');
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/profile/foto`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error al eliminar foto de perfil:', error);
        return {
            success: false,
            message: 'Error de conexión al eliminar foto',
        };
    }
};

// ==================== PAGOS / LIQUIDACIONES DE EMPRESA ====================

export interface ResumenPagos {
    pendienteActual: number;
    pendientePago: number;
    totalPagado: number;
    periodosActivos: number;
    periodosPendientes: number;
    periodosPagados: number;
    ultimoPago: {
        fecha_pago: string;
        total_neto: number;
        referencia_pago: string;
    } | null;
    reservasSinLiquidar: {
        cantidad: number;
        valor: number;
    };
}

export interface PeriodoLiquidacion {
    id_periodo: string;
    fecha_inicio: string;
    fecha_fin: string;
    fecha_cierre: string | null;
    fecha_pago: string | null;
    total_bruto: number;
    total_descuentos: number;
    comision_autonew: number;
    total_comision: number;
    total_neto: number;
    estado: 'activo' | 'cerrado' | 'pagado' | 'cancelado';
    cantidad_reservas: number;
    metodo_pago: string;
    referencia_pago: string;
    observaciones: string;
}

export interface DetalleLiquidacion {
    id_detalle: number;
    valor_bruto: number;
    valor_descuento: number;
    valor_neto: number;
    comision_aplicada: number;
    valor_comision: number;
    valor_final_empresa: number;
    fecha_servicio: string;
    tipo_descuento: string;
    numero_reserva: string;
    fecha: string;
    hora: string;
    cliente: string;
}

export interface ReservaPendienteLiquidar {
    id_reserva: number;
    numero_reserva: string;
    fecha: string;
    hora: string;
    estado: string;
    cliente: string;
    total_servicio: number;
    servicios: Array<{
        nombre: string;
        precio: number;
    }>;
}

/**
 * Obtener resumen de pagos de la empresa
 */
export const getResumenPagos = async (): Promise<ApiResponse<ResumenPagos>> => {
    return fetchApi<ResumenPagos>('/empresa/pagos/resumen');
};

/**
 * Obtener períodos de liquidación
 */
export const getPeriodosLiquidacion = async (estado?: 'pendiente' | 'pagado' | 'todos'): Promise<ApiResponse<PeriodoLiquidacion[]>> => {
    const queryParam = estado ? `?estado=${estado}` : '';
    return fetchApi<PeriodoLiquidacion[]>(`/empresa/pagos/periodos${queryParam}`);
};

/**
 * Obtener detalle de un período específico
 */
export const getDetallePeriodo = async (periodoId: string): Promise<ApiResponse<{ periodo: PeriodoLiquidacion; detalles: DetalleLiquidacion[] }>> => {
    return fetchApi<{ periodo: PeriodoLiquidacion; detalles: DetalleLiquidacion[] }>(`/empresa/pagos/periodos/${periodoId}`);
};

/**
 * Obtener reservas pendientes de liquidar
 */
export const getReservasPendientesLiquidar = async (): Promise<ApiResponse<ReservaPendienteLiquidar[]>> => {
    return fetchApi<ReservaPendienteLiquidar[]>('/empresa/pagos/reservas-pendientes');
};

export default {
    register,
    login,
    logout,
    getProfile,
    updateProfile,
    changePassword,
    isAuthenticated,
    healthCheck,
    saveToken,
    getToken,
    removeToken,
    saveUser,
    getUser,
    removeUser,
    getReservasUsuario,
    verificarSuscripcion,
    getServicios,
    getEmpresasPorServicios,
    getHorariosDisponibles,
    crearReserva,
    cancelarReserva,
    // Funciones de empresa
    loginEmpresa,
    logoutEmpresa,
    saveEmpresa,
    getEmpresa,
    removeEmpresa,
    getDashboardStats,
    getReservasEmpresa,
    actualizarEstadoReserva,
    getServiciosEmpresa,
    getServiciosCompletos,
    solicitarServicio,
    cancelarSolicitudServicio,
    getAnaliticas,
    getEmpresaProfile,
    // Funciones de perfil de empresa
    getPerfilEmpresa,
    actualizarPerfilBasico,
    actualizarInfoBancaria,
    cambiarContrasenaEmpresa,
    actualizarFotoPerfil,
    eliminarFotoPerfil,
    // Funciones de foto de perfil de cliente
    actualizarFotoPerfilUsuario,
    eliminarFotoPerfilUsuario,
    // Funciones de QR
    getReservaParaQR,
    verificarYCompletarReservaQR,
    getReservaPorNumero,
    // Funciones de pagos
    getResumenPagos,
    getPeriodosLiquidacion,
    getDetallePeriodo,
    getReservasPendientesLiquidar,
};
