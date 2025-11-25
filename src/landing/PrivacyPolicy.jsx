import React from 'react';
import { Typography } from 'antd';

const PrivacyPolicy = () => {
    return (
        <div style={{ padding: '20px' }}>
            <Typography.Title level={2}>Политика конфиденциальности</Typography.Title>
            <Typography.Paragraph>Дата вступления в силу: 13.03.2025</Typography.Paragraph>
            <Typography.Paragraph>Последнее обновление: 13.03.2025</Typography.Paragraph>

            <Typography.Title level={3}>1. Общие положения</Typography.Title>
            <Typography.Paragraph>
                Настоящая Политика конфиденциальности (далее — «Политика») регулирует порядок обработки и защиты персональных данных пользователей сайта [название сайта] (далее — «Сайт»), на котором пользователи создают и используют собственные модели ИИ-ассистентов.
                Мы уважаем право пользователей на конфиденциальность и обязуемся обрабатывать их данные исключительно в объёме, необходимом для обеспечения работы сервиса, без передачи третьим лицам и без использования в иных целях.
            </Typography.Paragraph>

            <Typography.Title level={3}>2. Какие данные мы обрабатываем</Typography.Title>
            <Typography.Paragraph>
                В процессе использования Сайта могут обрабатываться следующие категории данных:
            </Typography.Paragraph>
            <Typography.Paragraph>
                - Регистрационные данные<br/>
                Адрес электронной почты, имя пользователя, пароль (в зашифрованном виде).
            </Typography.Paragraph>
            <Typography.Paragraph>
                - Технические данные<br/>
                IP-адрес, информация о браузере и устройстве, файлы cookie (только для обеспечения работы Сайта).
            </Typography.Paragraph>
            <Typography.Paragraph>
                - Данные, передаваемые в ИИ-ассистентов<br/>
                Тексты, команды, файлы и иная информация, которую пользователь вводит или загружает для работы своей модели.
            </Typography.Paragraph>

            <Typography.Title level={3}>3. Цели обработки данных</Typography.Title>
            <Typography.Paragraph>
                Мы обрабатываем данные пользователей только для:
            </Typography.Paragraph>
            <Typography.Paragraph>
                - обеспечения работы Сайта и предоставления доступа к функционалу ИИ-ассистентов;
            </Typography.Paragraph>
            <Typography.Paragraph>
                - хранения и обработки данных, необходимых для функционирования пользовательских моделей;
            </Typography.Paragraph>
            <Typography.Paragraph>
                - технической поддержки и устранения ошибок;
            </Typography.Paragraph>
            <Typography.Paragraph>
                - обеспечения безопасности и предотвращения несанкционированного доступа.
            </Typography.Paragraph>

            <Typography.Title level={3}>4. Принципы обработки данных</Typography.Title>
            <Typography.Paragraph>
                - Минимизация — мы собираем и храним только те данные, которые необходимы для работы сервиса.
            </Typography.Paragraph>
            <Typography.Paragraph>
                - Отсутствие передачи третьим лицам — мы не продаём, не обмениваем и не передаём данные пользователей третьим лицам.
            </Typography.Paragraph>
            <Typography.Paragraph>
                - Отсутствие использования в маркетинговых целях — мы не используем данные для рекламы, аналитики или обучения сторонних моделей.
            </Typography.Paragraph>

            <Typography.Title level={3}>5. Работа с файлами и обучающими данными</Typography.Title>
            <Typography.Paragraph>
                - Все файлы, тексты, изображения, аудио, видео и иные материалы, загруженные пользователем в рамках работы его ИИ-ассистента, обрабатываются только для выполнения запросов и задач, поставленных самим пользователем.
            </Typography.Paragraph>
            <Typography.Paragraph>
                - Эти данные не используются для обучения, тестирования или улучшения чужих моделей, а также внутренних алгоритмов компании.
            </Typography.Paragraph>
            <Typography.Paragraph>
                - Доступ к данным имеют только автоматизированные процессы, необходимые для выполнения функций ассистента, и они не передаются третьим лицам.
            </Typography.Paragraph>
            <Typography.Paragraph>
                - После удаления пользователем своих данных или моделей, связанные файлы и обучающие материалы сразу же безвозвратно уничтожаются.
            </Typography.Paragraph>

            <Typography.Title level={3}>6. Хранение данных</Typography.Title>
            <Typography.Paragraph>
                - Данные хранятся только на защищённых серверах, расположенных в Нидерландах.
            </Typography.Paragraph>
            <Typography.Paragraph>
                - Пользователь может в любой момент удалить свои данные и модели через настройки аккаунта.
            </Typography.Paragraph>
            <Typography.Paragraph>
                - После удаления данные сразу же безвозвратно уничтожаются.
            </Typography.Paragraph>

            <Typography.Title level={3}>7. Права пользователей</Typography.Title>
            <Typography.Paragraph>
                Пользователи имеют право:
            </Typography.Paragraph>
            <Typography.Paragraph>
                - получать информацию о своих данных, которые обрабатываются;
            </Typography.Paragraph>
            <Typography.Paragraph>
                - требовать исправления или удаления данных;
            </Typography.Paragraph>
            <Typography.Paragraph>
                - отзывать согласие на обработку данных;
            </Typography.Paragraph>
            <Typography.Paragraph>
                - переносить свои данные в машиночитаемом формате.
            </Typography.Paragraph>

            <Typography.Title level={3}>8. Безопасность данных</Typography.Title>
            <Typography.Paragraph>
                Мы применяем современные технические и организационные меры защиты, включая:
            </Typography.Paragraph>
            <Typography.Paragraph>
                - шифрование данных при передаче и хранении;
            </Typography.Paragraph>
            <Typography.Paragraph>
                - контроль доступа и аутентификацию;
            </Typography.Paragraph>
            <Typography.Paragraph>
                - регулярное обновление систем безопасности.
            </Typography.Paragraph>

            <Typography.Title level={3}>9. Изменения в Политике</Typography.Title>
            <Typography.Paragraph>
                Мы можем обновлять Политику в случае изменений в законодательстве или работе сервиса. Обновлённая версия будет опубликована на этой странице с указанием даты вступления в силу.
            </Typography.Paragraph>

            <Typography.Title level={3}>10. Контакты</Typography.Title>
            <Typography.Paragraph>
                По вопросам, связанным с обработкой персональных данных, вы можете связаться с нами:
            </Typography.Paragraph>
            <Typography.Paragraph>
                - Email: info@info-bot.online
            </Typography.Paragraph>
            <Typography.Paragraph>
                - Адрес: Marysya AI, 123456, Амстердам, Нидерланды, ул. Примерная, д. 1
            </Typography.Paragraph>
        </div>
    );
};

export default PrivacyPolicy;
