
import React, { useEffect, useRef } from 'react';
import { Delivery, DeliveryStatus } from '../types';

interface DeliveryMapProps {
  deliveries: Delivery[];
  highlightId?: string;
}

const DeliveryMap: React.FC<DeliveryMapProps> = ({ deliveries, highlightId }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map if not already done
    if (!mapRef.current) {
      // Coordenadas de Belém, PA como centro padrão
      mapRef.current = (window as any).L.map(mapContainerRef.current).setView([-1.4558, -48.4902], 6); 
      (window as any).L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapRef.current);
    }

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Add new markers
    const bounds = (window as any).L.latLngBounds([]);
    
    deliveries.forEach(delivery => {
      let color = 'orange'; // PENDING
      if (delivery.status === DeliveryStatus.DELIVERED) color = 'green';
      else if (delivery.status === DeliveryStatus.IN_TRANSIT) color = 'blue';
      else if (delivery.status === DeliveryStatus.REJECTED) color = 'red';
      else if (delivery.status === DeliveryStatus.FAILED) color = 'gray';
      
      const markerIcon = (window as any).L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      const marker = (window as any).L.marker([delivery.lat, delivery.lng], { icon: markerIcon })
        .addTo(mapRef.current)
        .bindPopup(`
          <div style="font-family: sans-serif;">
            <strong style="color: #1e293b;">Pedido: ${delivery.orderNumber}</strong><br/>
            <span style="font-size: 11px; font-weight: bold; color: ${color}; uppercase">${delivery.status}</span><br/>
            <strong>Cliente:</strong> ${delivery.customerName}<br/>
            <strong>Cidade:</strong> ${delivery.city}, PA
          </div>
        `);

      if (delivery.id === highlightId) {
        marker.openPopup();
        mapRef.current.setView([delivery.lat, delivery.lng], 12);
      }

      markersRef.current.push(marker);
      bounds.extend([delivery.lat, delivery.lng]);
    });

    if (deliveries.length > 0 && !highlightId) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }

  }, [deliveries, highlightId]);

  return <div ref={mapContainerRef} className="leaflet-container shadow-inner border border-slate-200" />;
};

export default DeliveryMap;
