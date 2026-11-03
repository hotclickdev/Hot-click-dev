package com.hotclick.security;

/**
 * IP del cliente tal como entra en las llaves del limitador (rate limit y fallos de credencial).
 * Una IPv6 se reduce a su /64: quien tiene un /64 o más rota 2^64 direcciones y esquivaría un tope por IP.
 * IPv4 e IPv4-mapeada quedan completas; NAT64 (64:ff9b::/96) usa su IPv4 embebida, porque un /64 mezclaría
 * a todos los clientes del NAT. Lo que no sea una IP literal pasa igual (nunca consulta DNS).
 */
public final class IpParaLlave {

    /** Llave de la IP que no se pudo resolver: todas comparten un solo cupo (fail-closed, no abre cupos nuevos). */
    public static final String DESCONOCIDA = "desconocida";

    private IpParaLlave() {}

    /** Reduce la IP para una llave; {@code null} sigue siendo {@code null}. */
    public static String reducir(String ip) {
        if (ip == null || ip.indexOf(':') < 0 || !ip.matches("[0-9a-fA-F:.]+")) return ip; // sin DNS: solo literales
        try {
            java.net.InetAddress a = java.net.InetAddress.getByName(ip);
            if (!(a instanceof java.net.Inet6Address)) return a.getHostAddress();
            byte[] b = a.getAddress();
            if (esNat64(b)) { // 64:ff9b::/96: la IPv4 embebida es el cliente real; un /64 mezclaría a todos
                return (b[12] & 0xff) + "." + (b[13] & 0xff) + "." + (b[14] & 0xff) + "." + (b[15] & 0xff);
            }
            return String.format("%02x%02x:%02x%02x:%02x%02x:%02x%02x::/64",
                b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7]);
        } catch (java.net.UnknownHostException e) {
            return ip;
        }
    }

    /** Como {@link #reducir} pero nunca devuelve null ni vacío: una IP sin resolver usa {@link #DESCONOCIDA}. */
    public static String clave(String ip) {
        if (ip == null || ip.isBlank()) return DESCONOCIDA;
        return reducir(ip);
    }

    private static boolean esNat64(byte[] b) {
        if (b[0] != 0x00 || b[1] != 0x64 || (b[2] & 0xff) != 0xff || (b[3] & 0xff) != 0x9b) return false;
        for (int i = 4; i < 12; i++) if (b[i] != 0) return false;
        return true;
    }
}
