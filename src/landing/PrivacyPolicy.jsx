import React from 'react';
import { Typography } from 'antd';
import './PrivacyPolicy.css';

const PrivacyPolicy = () => {
    return (
        <main className="privacy-policy">
            <Typography.Title level={2}>Политика конфиденциальности</Typography.Title>
            <Typography.Paragraph>Дата вступления в силу: 13.03.2025</Typography.Paragraph>
            <Typography.Paragraph>Последнее обновление: 13.03.2025</Typography.Paragraph>

            <Typography.Title level={3}>1. Общие положения</Typography.Title>
            <Typography.Paragraph>
                Настоящая Политика конфиденциальности (далее — «Политика») регулирует порядок обработки и защиты персональных данных пользователей сайта kermy.org (далее — «Сайт»), на котором пользователи создают и используют собственные модели ИИ-агентов.
                Мы уважаем право пользователей на конфиденциальность и обязуемся обрабатывать их данные исключительно в объёме, необходимом для обеспечения работы сервиса, без передачи третьим лицам и без использования в иных целях.
            </Typography.Paragraph>

            <Typography.Title level={3}>2. Какие данные мы обрабатываем</Typography.Title>
            <Typography.Paragraph>
                В процессе использования Сайта могут обрабатываться следующие категории данных:
            </Typography.Paragraph>
            <Typography.Paragraph>
                - Регистрационные данные<br/>
                Имя пользователя - сохраняется в открытом виде, адрес электронной почты и пароль - сохраняются в зашифрованном виде.
            </Typography.Paragraph>
            <Typography.Paragraph>
                - Технические данные<br/>
                Файлы cookie только для хранения долгоживущего токена авторизации - это нужно только для обеспечения работы сайта.
            </Typography.Paragraph>
            <Typography.Paragraph>
                - Данные, передаваемые в ИИ-агентов<br/>
                Тексты, команды, файлы и иная информация, которую пользователь вводит или загружает для работы своей модели - сохраняются в зашифрованном виде.
            </Typography.Paragraph>

            <Typography.Title level={3}>3. Цели обработки данных</Typography.Title>
            <Typography.Paragraph>
                Мы сохраняем данные пользователей в зашифрованном виде только для:
            </Typography.Paragraph>
            <Typography.Paragraph>
                - обеспечения работы сайта и предоставления доступа к функционалу ИИ-агентов;
            </Typography.Paragraph>
            <Typography.Paragraph>
                - хранения и обработки данных, необходимых для функционирования каналов взаимодействия (токены авторизации);
            </Typography.Paragraph>
            <Typography.Paragraph>
                - обеспечения безопасности и предотвращения несанкционированного доступа.
            </Typography.Paragraph>

            <Typography.Title level={3}>4. Принципы обработки данных</Typography.Title>
            <Typography.Paragraph>
                - Минимизация — мы собираем и храним только те данные, которые необходимы для работы сервиса, все данные храним в зашифрованном виде..
            </Typography.Paragraph>
            <Typography.Paragraph>
                - Отсутствие передачи третьим лицам — мы не продаём, не обмениваем и не передаём данные пользователей третьим лицам.
            </Typography.Paragraph>
            <Typography.Paragraph>
                - Отсутствие использования в маркетинговых целях — мы не используем данные для рекламы, аналитики или обучения сторонних моделей.
            </Typography.Paragraph>

            <Typography.Title level={3}>5. Работа с файлами и обучающими данными</Typography.Title>
            <Typography.Paragraph>
                - Все файлы, тексты, изображения, аудио, видео и иные материалы, загруженные пользователем в рамках работы его ИИ-агента, обрабатываются только для выполнения запросов и задач, поставленных самим пользователем.
            </Typography.Paragraph>
            <Typography.Paragraph>
                - Эти данные не используются для обучения, тестирования или улучшения чужих моделей, а также наших внутренних алгоритмов.
            </Typography.Paragraph>
            <Typography.Paragraph>
                - Доступ к данным имеют только автоматизированные процессы (которые получили этот доступ от MasterKey пользователя в процессе авторизации), необходимые для выполнения функций агента, и они не передаются третьим лицам.
            </Typography.Paragraph>
            <Typography.Paragraph>
                - После удаления пользователем своих данных или моделей, связанные файлы и обучающие материалы сразу же безвозвратно уничтожаются.
            </Typography.Paragraph>

            <Typography.Title level={3}>6. Хранение данных</Typography.Title>
            <Typography.Paragraph>
                - Данные хранятся только на защищённых серверах, расположенных в Нидерландах.
            </Typography.Paragraph>
            <Typography.Paragraph>
                - Пользователь может в любой момент удалить все свои данные и модели через настройки аккаунта.
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
                - требовать исправления или удаления данных (если это технически возможно);
            </Typography.Paragraph>
            <Typography.Paragraph>
                - отзывать согласие на обработку данных (самостоятельно удалить все свои данные);
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
                - Email: marusia@kermy.org<br/>
                - Telegram: @ikermy
            </Typography.Paragraph>
        </main>
    );
};

export default PrivacyPolicy;
