/****** Object:  UserDefinedTableType [dbo].[UDT_IdList]    Script Date: 1/25/2016 9:26:44 PM ******/
CREATE TYPE [dbo].[UDT_IdList] AS TABLE(
	[Id] [varchar](50) NULL
)
GO
/****** Object:  Table [dbo].[Concepts]    Script Date: 1/25/2016 9:26:44 PM ******/
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
/****** Object:  Table [dbo].[ConceptTypes]    Script Date: 1/25/2016 9:26:44 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET ANSI_PADDING ON
GO
CREATE TABLE [dbo].[ConceptTypes](
	[Id] [int] NOT NULL,
	[Name] [varchar](50) NOT NULL,
 CONSTRAINT [PK_ConceptTypes] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)
) ON [PRIMARY]

GO
SET ANSI_PADDING OFF
GO
/****** Object:  Table [dbo].[Documents]    Script Date: 1/25/2016 9:26:44 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET ANSI_PADDING ON
GO
CREATE TABLE [dbo].[Documents](
	[SourceId] [int] NOT NULL,
	[Id] [varchar](50) NOT NULL,
	[Description] [varchar](1024) NULL,
	[StatusId] [int] NOT NULL,
 CONSTRAINT [PK_Documents_1] PRIMARY KEY CLUSTERED 
(
	[SourceId] ASC,
	[Id] ASC
)
) ON [PRIMARY]

GO
SET ANSI_PADDING OFF
GO
/****** Object:  Table [dbo].[DocumentStatus]    Script Date: 1/25/2016 9:26:44 PM ******/
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
/****** Object:  Table [dbo].[Graph]    Script Date: 1/25/2016 9:26:44 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET ANSI_PADDING ON
GO
CREATE TABLE [dbo].[Graph](
	[SourceId] [int] NOT NULL,
	[DocId] [varchar](50) NOT NULL,
	[SentenceIndex] [int] NOT NULL,
	[FromConceptId] [int] NOT NULL,
	[ToConceptId] [int] NOT NULL,
	[Relation] [int] NOT NULL,
	[Score] [real] NOT NULL,
	[ModelVersion] [varchar](50) NOT NULL,
 CONSTRAINT [PK_Graph_1] PRIMARY KEY CLUSTERED 
(
	[SourceId] ASC,
	[DocId] ASC,
	[SentenceIndex] ASC,
	[FromConceptId] ASC,
	[ToConceptId] ASC
)
) ON [PRIMARY]

GO
SET ANSI_PADDING OFF
GO
/****** Object:  Table [dbo].[Sentences]    Script Date: 1/25/2016 9:26:44 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET ANSI_PADDING ON
GO
CREATE TABLE [dbo].[Sentences](
	[SourceId] [int] NOT NULL,
	[DocId] [varchar](50) NOT NULL,
	[Index] [int] NOT NULL,
	[Sentence] [text] NOT NULL,
 CONSTRAINT [PK_Sentences] PRIMARY KEY CLUSTERED 
(
	[SourceId] ASC,
	[DocId] ASC,
	[Index] ASC
)
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]

GO
SET ANSI_PADDING OFF
GO
/****** Object:  Table [dbo].[Sources]    Script Date: 1/25/2016 9:26:44 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET ANSI_PADDING ON
GO
CREATE TABLE [dbo].[Sources](
	[Id] [int] NOT NULL,
	[name] [varchar](50) NOT NULL,
	[Url] [varchar](1024) NULL,
 CONSTRAINT [PK_Sources] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)
) ON [PRIMARY]

GO
SET ANSI_PADDING OFF
GO
/****** Object:  Table [dbo].[test]    Script Date: 1/25/2016 9:26:44 PM ******/
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
/****** Object:  Index [IX_Graph_ModelVersion]    Script Date: 1/25/2016 9:26:44 PM ******/
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
ALTER TABLE [dbo].[Documents]  WITH CHECK ADD  CONSTRAINT [FK_Documents_Sources] FOREIGN KEY([SourceId])
REFERENCES [dbo].[Sources] ([Id])
GO
ALTER TABLE [dbo].[Documents] CHECK CONSTRAINT [FK_Documents_Sources]
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
ALTER TABLE [dbo].[Graph]  WITH CHECK ADD  CONSTRAINT [FK_Graph_Sentences] FOREIGN KEY([SourceId], [DocId], [SentenceIndex])
REFERENCES [dbo].[Sentences] ([SourceId], [DocId], [Index])
GO
ALTER TABLE [dbo].[Graph] CHECK CONSTRAINT [FK_Graph_Sentences]
GO
ALTER TABLE [dbo].[Sentences]  WITH CHECK ADD  CONSTRAINT [FK_Sentences_Documents] FOREIGN KEY([SourceId], [DocId])
REFERENCES [dbo].[Documents] ([SourceId], [Id])
GO
ALTER TABLE [dbo].[Sentences] CHECK CONSTRAINT [FK_Sentences_Documents]
GO
/****** Object:  StoredProcedure [dbo].[FilterExistingDocuments]    Script Date: 1/25/2016 9:26:44 PM ******/
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
	@SourceId int,
	@Ids UDT_IdList READONLY
AS
BEGIN

	SET NOCOUNT ON;
	
	SELECT i.Id FROM @Ids i
	LEFT JOIN Documents d
	ON d.SourceId = @SourceId AND i.Id = d.Id
	WHERE d.Id IS NULL

END



GO
/****** Object:  StoredProcedure [dbo].[UpdateDocumentStatus]    Script Date: 1/25/2016 9:26:44 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [dbo].[UpdateDocumentStatus]
	@SourceId int,
	@DocumentId VARCHAR(50),
	@StatusId int
AS
BEGIN

	SET NOCOUNT ON;
	
	UPDATE Documents
	SET StatusId = @StatusId
	WHERE StatusId = @StatusId AND Id = @DocumentId

END
GO
/****** Object:  StoredProcedure [dbo].[UpsertDocument]    Script Date: 1/25/2016 9:26:44 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		amitu
-- Description:	Merge a document
-- =============================================
CREATE PROCEDURE [dbo].[UpsertDocument]
	@SourceId int,
	@Id varchar(50),
	@Description varchar(1024),
	@StatusId int
AS
BEGIN

	SET NOCOUNT ON;

	MERGE 
	   Documents
	USING ( 
		VALUES (@SourceId, @Id, @Description, @StatusId)
	) AS source (SourceId, Id, Description, StatusId) 
	ON Documents.SourceId = source.SourceId AND Documents.Id = source.Id 
	WHEN MATCHED THEN
	   UPDATE SET Description = source.Description, StatusId = source.StatusId
	WHEN NOT MATCHED THEN
	   INSERT (SourceId, Id, Description, StatusId)
	   VALUES (SourceId, Id, Description, StatusId)
	; --A MERGE statement must be terminated by a semi-colon (;).

END
GO




INSERT INTO DocumentStatus (Id,Name) VALUES (1, 'Processing')
INSERT INTO DocumentStatus (Id,Name) VALUES (2, 'Scoring')
INSERT INTO DocumentStatus (Id,Name) VALUES (3, 'Processed')

INSERT INTO Sources (Id ,name ,Url) VALUES (1, 'Pubmed', 'http://pubmed.com')
INSERT INTO Sources (Id ,name ,Url) VALUES (2, 'PMC', 'http://pmc.com')

INSERT INTO ConceptTypes (Id, Name) VALUES (1, 'Gene')
INSERT INTO ConceptTypes (Id, Name) VALUES (2, 'Species')
INSERT INTO ConceptTypes (Id, Name) VALUES (3, 'Mirna')
INSERT INTO ConceptTypes (Id, Name) VALUES (4, 'Chemical')
INSERT INTO ConceptTypes (Id, Name) VALUES (5, 'Other')
