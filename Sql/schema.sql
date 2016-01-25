
/****** Object:  UserDefinedTableType [dbo].[UDT_IdList]    Script Date: 1/25/2016 1:12:20 PM ******/
CREATE TYPE [dbo].[UDT_IdList] AS TABLE(
	[Id] [varchar](50) NULL
)
GO
/****** Object:  Table [dbo].[Concepts]    Script Date: 1/25/2016 1:12:20 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET ANSI_PADDING ON
GO
CREATE TABLE [dbo].[Concepts](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[ConceptTypeId] [int] NOT NULL,
	[Name] [varchar](100) NOT NULL,
	[Description] [varchar](1024) NULL,
 CONSTRAINT [PK_Concepts] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)
) ON [PRIMARY]

GO
SET ANSI_PADDING OFF
GO
/****** Object:  Table [dbo].[ConceptTypes]    Script Date: 1/25/2016 1:12:20 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET ANSI_PADDING ON
GO
CREATE TABLE [dbo].[ConceptTypes](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[Name] [varchar](100) NOT NULL,
 CONSTRAINT [PK_ConceptTypes] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)
) ON [PRIMARY]

GO
SET ANSI_PADDING OFF
GO
/****** Object:  Table [dbo].[Documents]    Script Date: 1/25/2016 1:12:20 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET ANSI_PADDING ON
GO
CREATE TABLE [dbo].[Documents](
	[Id] [varchar](50) NOT NULL,
	[Description] [varchar](1024) NULL,
	[Source] [varchar](2048) NULL,
	[StatusId] [int] NOT NULL,
 CONSTRAINT [PK_Documents_1] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)
) ON [PRIMARY]

GO
SET ANSI_PADDING OFF
GO
/****** Object:  Table [dbo].[DocumentStatus]    Script Date: 1/25/2016 1:12:20 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET ANSI_PADDING ON
GO
CREATE TABLE [dbo].[DocumentStatus](
	[Id] [int] NOT NULL,
	[Name] [varchar](50) NOT NULL,
 CONSTRAINT [PK_DocumentStatus] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)
) ON [PRIMARY]

GO
SET ANSI_PADDING OFF
GO
/****** Object:  Table [dbo].[Graph]    Script Date: 1/25/2016 1:12:20 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET ANSI_PADDING ON
GO
CREATE TABLE [dbo].[Graph](
	[DocId] [varchar](50) NOT NULL,
	[SentenceIndex] [int] NOT NULL,
	[FromConceptId] [int] NOT NULL,
	[ToConceptId] [int] NOT NULL,
	[Relation] [int] NOT NULL,
	[Score] [real] NOT NULL,
	[ModelVersion] [varchar](50) NOT NULL,
 CONSTRAINT [PK_Graph_1] PRIMARY KEY CLUSTERED 
(
	[DocId] ASC,
	[SentenceIndex] ASC,
	[FromConceptId] ASC,
	[ToConceptId] ASC
)
) ON [PRIMARY]

GO
SET ANSI_PADDING OFF
GO
/****** Object:  Table [dbo].[Sentences]    Script Date: 1/25/2016 1:12:20 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET ANSI_PADDING ON
GO
CREATE TABLE [dbo].[Sentences](
	[DocId] [varchar](50) NOT NULL,
	[Index] [int] NOT NULL,
	[Sentence] [text] NOT NULL,
 CONSTRAINT [PK_Sentences] PRIMARY KEY CLUSTERED 
(
	[DocId] ASC,
	[Index] ASC
)
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]

GO
SET ANSI_PADDING OFF
GO
/****** Object:  Table [dbo].[test]    Script Date: 1/25/2016 1:12:20 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET ANSI_PADDING ON
GO
CREATE TABLE [dbo].[test](
	[Name] [varchar](50) NOT NULL,
 CONSTRAINT [PK_Roles] PRIMARY KEY CLUSTERED 
(
	[Name] ASC
)
) ON [PRIMARY]

GO
SET ANSI_PADDING OFF
GO
SET ANSI_PADDING ON

GO
/****** Object:  Index [IX_Graph_ModelVersion]    Script Date: 1/25/2016 1:12:20 PM ******/
CREATE NONCLUSTERED INDEX [IX_Graph_ModelVersion] ON [dbo].[Graph]
(
	[ModelVersion] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Documents] ADD  CONSTRAINT [DF_Documents_StatusId]  DEFAULT ((1)) FOR [StatusId]
GO
ALTER TABLE [dbo].[Concepts]  WITH CHECK ADD  CONSTRAINT [FK_Concepts_ConceptTypes] FOREIGN KEY([ConceptTypeId])
REFERENCES [dbo].[ConceptTypes] ([Id])
GO
ALTER TABLE [dbo].[Concepts] CHECK CONSTRAINT [FK_Concepts_ConceptTypes]
GO
ALTER TABLE [dbo].[Documents]  WITH CHECK ADD  CONSTRAINT [FK_Documents_DocumentStatus] FOREIGN KEY([StatusId])
REFERENCES [dbo].[DocumentStatus] ([Id])
GO
ALTER TABLE [dbo].[Documents] CHECK CONSTRAINT [FK_Documents_DocumentStatus]
GO
ALTER TABLE [dbo].[Graph]  WITH CHECK ADD  CONSTRAINT [FK_Graph_Concepts_From] FOREIGN KEY([FromConceptId])
REFERENCES [dbo].[Concepts] ([Id])
GO
ALTER TABLE [dbo].[Graph] CHECK CONSTRAINT [FK_Graph_Concepts_From]
GO
ALTER TABLE [dbo].[Graph]  WITH CHECK ADD  CONSTRAINT [FK_Graph_Concepts_To] FOREIGN KEY([ToConceptId])
REFERENCES [dbo].[Concepts] ([Id])
GO
ALTER TABLE [dbo].[Graph] CHECK CONSTRAINT [FK_Graph_Concepts_To]
GO
ALTER TABLE [dbo].[Graph]  WITH CHECK ADD  CONSTRAINT [FK_Graph_Sentences] FOREIGN KEY([DocId], [SentenceIndex])
REFERENCES [dbo].[Sentences] ([DocId], [Index])
GO
ALTER TABLE [dbo].[Graph] CHECK CONSTRAINT [FK_Graph_Sentences]
GO
ALTER TABLE [dbo].[Sentences]  WITH CHECK ADD  CONSTRAINT [FK_Sentences_Documents1] FOREIGN KEY([DocId])
REFERENCES [dbo].[Documents] ([Id])
GO
ALTER TABLE [dbo].[Sentences] CHECK CONSTRAINT [FK_Sentences_Documents1]
GO
/****** Object:  StoredProcedure [dbo].[FilterExistingDocuments]    Script Date: 1/25/2016 1:12:20 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		amitu
-- Description:	Filter document Ids, returning Ids that are not found

/*
-- define an instance of your user-defined table type
DECLARE @udtIds UDT_IdList

-- fill some values into that table
INSERT INTO @udtIds VALUES('One'), ('Two'), ('Three'), ('aaaaa1')

-- call your stored proc
DECLARE @return_value int
EXEC    @return_value = [FilterExistingDocuments]
        @Ids = @udtIds   -- pass in that UDT table type here!

-- SELECT  'Return Value' = @return_value
GO
*/

-- =============================================
CREATE PROCEDURE [dbo].[FilterExistingDocuments]
	@Ids UDT_IdList READONLY
AS
BEGIN

	SET NOCOUNT ON;
	
	SELECT i.Id FROM @Ids i
	LEFT JOIN Documents d
	ON i.Id = d.Id
	WHERE d.Id IS NULL

END



GO
/****** Object:  StoredProcedure [dbo].[UpdateDocumentStatus]    Script Date: 1/25/2016 1:12:20 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [dbo].[UpdateDocumentStatus]
	@DocumentId VARCHAR(50),
	@StatusId int
AS
BEGIN

	SET NOCOUNT ON;
	
	UPDATE Documents
	SET StatusId = @StatusId
	WHERE Id = @DocumentId

END
GO
/****** Object:  StoredProcedure [dbo].[UpsertDocument]    Script Date: 1/25/2016 1:12:20 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		amitu
-- Description:	Merge a document
-- =============================================
CREATE PROCEDURE [dbo].[UpsertDocument]
	@Id varchar(50),
	@Description varchar(1024),
	@Source varchar(2048)
AS
BEGIN

	SET NOCOUNT ON;

	MERGE 
	   Documents
	USING ( 
		VALUES (@Id, @Description, @Source)
	) AS source (Id, Description, Source) 
	ON Documents.Id = source.Id 
	WHEN MATCHED THEN
	   UPDATE SET Description = source.Description
	WHEN NOT MATCHED THEN
	   INSERT (Id, Description, Source)
	   VALUES (Id, Description, Source)
	; --A MERGE statement must be terminated by a semi-colon (;).

END
GO



INSERT INTO DocumentStatus (Id,Name) VALUES (1, 'Processing')
INSERT INTO DocumentStatus (Id,Name) VALUES (2, 'Scoring')
INSERT INTO DocumentStatus (Id,Name) VALUES (3, 'Processed')

