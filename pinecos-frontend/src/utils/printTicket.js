import api from '../services/api';

export const imprimirTicketHtml = async (idVenta) => {
  const response = await api.get(`/Tickets/venta/${idVenta}/html`, {
    responseType: 'text'
  });

  const ventana = window.open('', '_blank', 'width=420,height=700');

  if (!ventana) {
    throw new Error('El navegador bloqueó la ventana de impresión');
  }

  ventana.document.open();
  ventana.document.write(response.data);
  ventana.document.close();
};