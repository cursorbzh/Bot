import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export interface NotificationSettings {
  enabled: boolean;
  arbitrageAlerts: {
    enabled: boolean;
    minSpreadPercentage: number;
    minProfit: number;
  };
  newTokenAlerts: {
    enabled: boolean;
  };
  walletTrackingAlerts: {
    enabled: boolean;
    minTransactionValue: number;
  };
  systemAlerts: {
    enabled: boolean;
    errors: boolean;
    statusChanges: boolean;
  };
}

export function useNotifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isTestingNotification, setIsTestingNotification] = useState(false);

  // Fetche les paramètres de notification
  const { 
    data: settings, 
    isLoading,
    error 
  } = useQuery({
    queryKey: ['/api/notifications/settings'],
    // L'endpoint est maintenant disponible
    enabled: true,
    staleTime: 60000, // Rafraîchir après 1 minute
    queryFn: async () => {
      try {
        const res = await fetch('/api/notifications/settings');
        if (!res.ok) {
          throw new Error(`${res.status}: ${res.statusText}`);
        }
        return await res.json();
      } catch (error) {
        console.error("Erreur lors de la récupération des paramètres de notification:", error);
        return undefined;
      }
    }
  });

  // Met à jour les paramètres de notification
  const updateSettings = useMutation({
    mutationFn: async (newSettings: NotificationSettings) => {
      try {
        const res = await fetch('/api/notifications/settings', {
          method: 'POST',
          body: JSON.stringify(newSettings),
          headers: {
            'Content-Type': 'application/json'
          }
        });
        if (!res.ok) {
          throw new Error(`${res.status}: ${res.statusText}`);
        }
        return await res.json();
      } catch (error) {
        console.error("Erreur de mise à jour des paramètres de notification:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/settings'] });
      toast({
        title: "Paramètres mis à jour",
        description: "Les paramètres de notification ont été enregistrés avec succès.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les paramètres. Veuillez réessayer.",
        variant: "destructive",
      });
      console.error("Erreur de mise à jour des paramètres:", error);
    }
  });

  // Envoie une notification de test
  const testNotification = useMutation({
    mutationFn: async () => {
      try {
        const res = await fetch('/api/notifications/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        if (!res.ok) {
          throw new Error(`${res.status}: ${res.statusText}`);
        }
        return await res.json();
      } catch (error) {
        console.error("Erreur d'envoi de notification de test:", error);
        throw error;
      }
    },
    onMutate: () => {
      setIsTestingNotification(true);
    },
    onSuccess: () => {
      toast({
        title: "Notification de test envoyée",
        description: "Vérifiez votre compte Telegram pour confirmer la réception.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la notification de test. Vérifiez votre configuration Telegram.",
        variant: "destructive",
      });
      console.error("Erreur d'envoi de notification de test:", error);
    },
    onSettled: () => {
      setIsTestingNotification(false);
    }
  });

  return {
    settings: settings || {
      enabled: true,
      arbitrageAlerts: {
        enabled: true,
        minSpreadPercentage: 2.0,
        minProfit: 5.0,
      },
      newTokenAlerts: {
        enabled: true,
      },
      walletTrackingAlerts: {
        enabled: true,
        minTransactionValue: 1000,
      },
      systemAlerts: {
        enabled: true,
        errors: true,
        statusChanges: true,
      },
    },
    isLoading,
    error,
    updateSettings: (newSettings: NotificationSettings) => updateSettings.mutate(newSettings),
    testNotification: () => testNotification.mutate(),
    isTestingNotification
  };
}