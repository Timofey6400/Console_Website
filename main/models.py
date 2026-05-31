from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

class UserProfile(models.Model):
    # Связываем профиль со стандартным пользователем Django (1 к 1)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    # Текстовое поле, где будет лежать строка JSON с пакетами
    installed_packages = models.TextField(default='[]')

    def __str__(self):
        return f"Profile for {self.user.username}"

# Сигнал: как только создается новый User, Django автоматически создаст для него UserProfile
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()

# Create your models here.
