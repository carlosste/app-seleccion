-- Los triggers corren con los permisos de quien inserta (el postulante). Sin esto, el número
-- anónimo y el límite de postulantes se calcularían con datos que el postulante no ve.
alter function public.asignar_numero_anonimo() security definer;
alter function public.validar_limite_postulantes() security definer;
